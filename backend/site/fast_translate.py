"""
Faster driver for the same job robust_translate.py does — reuses its exact
page rules (skip style/script/head, translate title+meta, RTL font swap,
asset-path rewrites, chrome.js T-object regex) but replaces the slow part:
robust_translate spawned a whole new Python process per text string just to
get a 10s timeout, which is 300-1000ms of pure process/import overhead on
top of the network call, run strictly one string at a time.

Here a ThreadPoolExecutor gives the same timeout behaviour far cheaper
(threads, not processes), translations run concurrently, and identical
repeated strings ("Get started", "Log in", ...) are translated once and
reused — both across one page and across the whole run.

ponytail: a stuck thread is abandoned, not killed (Python can't kill
threads) — fine for a one-off batch script, not for a long-lived server.
"""
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutTimeout
from bs4 import BeautifulSoup, Comment
from deep_translator import GoogleTranslator

LANGS = {
    'ar': 'العربية', 'bn': 'বাংলা', 'es': 'Español',
    'fr': 'Français', 'hi': 'हिंदी', 'pt': 'Português', 'ru': 'Русский',
    'ur': 'اردو', 'zh-CN': '中文'
}
RTL_LANGS = {'ar', 'ur'}

TARGET_FILES = [
    'index.html', 'builders.html', 'validators.html',
    'idea-validation.html', 'user-testing.html',
]

WORKERS = 8
# One flat pool — translate_one must never submit to this from a thread
# that is itself running inside this pool (nesting submissions on the same
# pool deadlocks once all workers are blocked waiting on their own child
# submission). translate_many is the only thing that submits; translate_one
# just calls the network function directly on whatever thread runs it.
_executor = ThreadPoolExecutor(max_workers=WORKERS)
_cache = {}  # (lang, text) -> translated


def translate_one(api_lang, text, retries=3):
    """Runs ON a worker thread (called via translate_many's submit) or
    directly on the caller's thread (title/meta, single-string calls) —
    either way, no further submission to _executor happens in here."""
    key = (api_lang, text)
    if key in _cache:
        return _cache[key]
    translator = GoogleTranslator(source='en', target=api_lang)
    for attempt in range(retries):
        try:
            result = translator.translate(text)
            if result:
                _cache[key] = result
                return result
        except Exception as e:
            print(f"Error on attempt {attempt} for {text[:30]!r}: {e}")
        time.sleep(0.5)
    _cache[key] = text
    return text


def translate_many(api_lang, texts):
    """Translate a list of (possibly repeated) strings concurrently,
    de-duped, preserving order in the returned list."""
    uniq = list({t for t in texts if (api_lang, t) not in _cache})
    if uniq:
        futs = {_executor.submit(translate_one, api_lang, t): t for t in uniq}
        for fut in futs:
            try:
                fut.result(timeout=30)
            except FutTimeout:
                text = futs[fut]
                print(f"Timeout (30s) waiting on: {text[:30]!r}")
                _cache[(api_lang, text)] = text
    return [_cache.get((api_lang, t), t) for t in texts]


def translate_html_file(filepath, outpath, lang_code, api_lang):
    if os.path.exists(outpath):
        print(f"Skipping {outpath} (already exists)")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    nodes = []
    for element in soup.find_all(string=True):
        if isinstance(element, Comment):
            continue
        if element.parent.name in ['style', 'script', 'head', 'title', 'meta', '[document]']:
            continue
        text = str(element).strip()
        if text and len(text) > 1 and not text.isnumeric():
            nodes.append(element)

    translated = translate_many(api_lang, [str(n).strip() for n in nodes])
    for element, new_text in zip(nodes, translated):
        if new_text:
            element.replace_with(new_text)

    if soup.title and soup.title.string:
        t = translate_one(api_lang, soup.title.string.strip())
        if t:
            soup.title.string.replace_with(t)
    meta_desc = soup.find('meta', attrs={'name': 'description'})
    if meta_desc and meta_desc.get('content'):
        t = translate_one(api_lang, meta_desc['content'].strip())
        if t:
            meta_desc['content'] = t

    if soup.html and soup.html.has_attr('lang'):
        soup.html['lang'] = lang_code[:2]
    if lang_code[:2] in RTL_LANGS and soup.html:
        soup.html['dir'] = 'rtl'
    if lang_code[:2] in RTL_LANGS:
        font_link = soup.find('link', href=lambda h: h and 'fonts.googleapis.com/css2' in h)
        if font_link and 'Noto+Sans+Arabic' not in font_link['href']:
            font_link['href'] = font_link['href'].replace(
                'family=Plus+Jakarta+Sans',
                'family=Noto+Sans+Arabic:wght@400;500;600;700;800&family=Plus+Jakarta+Sans',
            )

    for link in soup.find_all('link', href=True):
        if link['href'] == 'site.css':
            link['href'] = '/site/site.css'
    for script in soup.find_all('script', src=True):
        if script['src'] in ('chrome.js', '/site/chrome.js'):
            script['src'] = f'/site/{lang_code[:2]}/chrome.js'
        elif script['src'] in ('site.js', 'worldmap.js'):
            script['src'] = f'/site/{script["src"]}'
    for img in soup.find_all('img', src=True):
        if img['src'].startswith('shots/'):
            img['src'] = f'/site/{img["src"]}'
        elif img['src'].startswith('/site/shots/'):
            pass  # already absolute (idea-validation/user-testing use absolute srcs already)

    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    with open(outpath, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print(f"Generated {outpath}")


def translate_chrome_js(in_path, out_path, lang_code, api_lang):
    if os.path.exists(out_path):
        print(f"Skipping {out_path} (already exists)")
        return

    with open(in_path, 'r', encoding='utf-8') as f:
        content = f.read()

    match = re.search(r'const T = \{([\s\S]*?)\};', content)
    if not match:
        print("Could not find T object in chrome.js")
        return

    t_block = match.group(1)
    lines = t_block.split('\n')
    originals = []
    for line in lines:
        if ':' in line and '"' in line:
            str_match = re.search(r'"(.*?)"', line.split(':', 1)[1].strip())
            if str_match and '${' not in str_match.group(1):
                originals.append(str_match.group(1))
    translations = translate_many(api_lang, originals)
    trans_iter = iter(translations)

    new_lines = []
    for line in lines:
        if ':' in line and '"' in line:
            key, val = line.split(':', 1)
            val = val.strip()
            str_match = re.search(r'"(.*?)"', val)
            if str_match and '${' not in str_match.group(1):
                translated = next(trans_iter).replace('"', '\\"')
                line = f'{key}: "{translated}",'
        new_lines.append(line)
    new_t_block = '\n'.join(new_lines)

    content = content.replace(t_block, new_t_block)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Generated {out_path}")


if __name__ == "__main__":
    base_dir = "."
    for lang, name in LANGS.items():
        lang_code = lang[:2]
        api_lang = lang
        print(f"Translating to {name} ({lang_code})...")
        translate_chrome_js(os.path.join(base_dir, 'chrome.js'), os.path.join(base_dir, lang_code, 'chrome.js'), lang_code, api_lang)
        for hf in TARGET_FILES:
            translate_html_file(os.path.join(base_dir, hf), os.path.join(base_dir, lang_code, hf), lang_code, api_lang)
    print("Translation of site complete.")
