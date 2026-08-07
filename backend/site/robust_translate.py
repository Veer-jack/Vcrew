import os
import re
import json
import time
from bs4 import BeautifulSoup, Comment
from deep_translator import GoogleTranslator

# Run this from backend/site
LANGS = {
    'ar': 'العربية', 'bn': 'বাংলা', 'es': 'Español',
    'fr': 'Français', 'hi': 'हिंदी', 'pt': 'Português', 'ru': 'Русский',
    'ur': 'اردو', 'zh-CN': '中文'
}
RTL_LANGS = {'ar', 'ur'}
import multiprocessing
from deep_translator import GoogleTranslator

def _do_translate(lang, text, out_queue):
    try:
        translator = GoogleTranslator(source='en', target=lang)
        out_queue.put(translator.translate(text))
    except Exception as e:
        out_queue.put(e)

def translate_text(lang, text, retries=3):
    for attempt in range(retries):
        q = multiprocessing.Queue()
        p = multiprocessing.Process(target=_do_translate, args=(lang, text, q))
        p.start()
        p.join(10) # 10 seconds timeout
        if p.is_alive():
            print(f"Timeout on attempt {attempt}")
            p.terminate()
            p.join()
        else:
            try:
                res = q.get()
            except Exception as e:
                print(f"Error unpickling result: {e}")
                time.sleep(1)
                continue
            if isinstance(res, Exception):
                print(f"Error: {res}")
            else:
                return res
        time.sleep(1)
    return text

def translate_html_file(filepath, outpath, lang_code, lang_name, api_lang=None):
    if os.path.exists(outpath):
        print(f"Skipping {outpath} (already exists)")
        return

    api_lang = api_lang or lang_code

    with open(filepath, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    for element in soup.find_all(text=True):
        if isinstance(element, Comment):
            continue
        if element.parent.name in ['style', 'script', 'head', 'title', 'meta', '[document]']:
            continue
        text = str(element).strip()
        if text and len(text) > 1 and not text.isnumeric():
            translated = translate_text(api_lang, text)
            if translated:
                element.replace_with(translated)

    # <title> and the meta description are skipped by the loop above (both
    # live under <head>) but are still user-visible (browser tab, search
    # results, social previews) so translate them explicitly.
    if soup.title and soup.title.string:
        translated = translate_text(api_lang, soup.title.string.strip())
        if translated:
            soup.title.string.replace_with(translated)
    meta_desc = soup.find('meta', attrs={'name': 'description'})
    if meta_desc and meta_desc.get('content'):
        translated = translate_text(api_lang, meta_desc['content'].strip())
        if translated:
            meta_desc['content'] = translated

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

    # These pages are served from /site/<lang>/<file>.html, so bare relative
    # references to shared assets (site.css, worldmap.js, site.js, shots/*)
    # need to point back at the shared /site/ root instead of resolving into
    # the per-language directory (where they don't exist).
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

    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    with open(outpath, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print(f"Generated {outpath}")

def translate_chrome_js(in_path, out_path, lang_code, lang_name, api_lang=None):
    if os.path.exists(out_path):
        print(f"Skipping {out_path} (already exists)")
        return

    api_lang = api_lang or lang_code

    with open(in_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract the T object
    match = re.search(r'const T = \{([\s\S]*?)\};', content)
    if not match:
        print("Could not find T object in chrome.js")
        return

    t_block = match.group(1)
    new_t_block = ""
    for line in t_block.split('\n'):
        if ':' in line and '"' in line:
            key, val = line.split(':', 1)
            val = val.strip()
            # Extract string from inside quotes
            str_match = re.search(r'"(.*?)"', val)
            if str_match:
                original_text = str_match.group(1)
                # Skip strings with interpolation like ${...} for now or translate carefully
                if '${' not in original_text:
                    translated = translate_text(api_lang, original_text)
                    if translated:
                        # Escape quotes
                        translated = translated.replace('"', '\\"')
                        line = f'{key}: "{translated}",'
        new_t_block += line + '\n'

    content = content.replace(t_block, new_t_block)
    
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Generated {out_path}")

if __name__ == "__main__":
    base_dir = "."
    html_files = [f for f in os.listdir(base_dir) if f.endswith('.html')]

    for lang, name in LANGS.items():
        lang_code = lang[:2]
        api_lang = lang  # e.g. 'zh-CN' — the translator needs the full code even though dirs/paths use the 2-letter form
        print(f"Translating to {name} ({lang_code})...")

        # Translate chrome.js
        translate_chrome_js(os.path.join(base_dir, 'chrome.js'), os.path.join(base_dir, lang_code, 'chrome.js'), lang_code, name, api_lang)

        # Translate HTML files
        for hf in html_files:
            in_path = os.path.join(base_dir, hf)
            out_path = os.path.join(base_dir, lang_code, hf)
            translate_html_file(in_path, out_path, lang_code, name, api_lang)

print("Translation of site complete.")
