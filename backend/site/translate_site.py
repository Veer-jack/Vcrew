import os
import re
from bs4 import BeautifulSoup
from deep_translator import GoogleTranslator

# Note: Run this script from backend/site

LANGS = {
    'en': 'English', 'ar': 'العربية', 'bn': 'বাংলা', 'es': 'Español',
    'fr': 'Français', 'hi': 'हिंदी', 'pt': 'Português', 'ru': 'Русский',
    'ur': 'اردو', 'zh-CN': '中文'
}

def translate_html_file(filepath, outpath, target_lang):
    if target_lang == 'en':
        return # English is default, handled separately
    
    with open(filepath, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')
    
    translator = GoogleTranslator(source='en', target=target_lang)
    
    # Find all text nodes
    for element in soup.find_all(text=True):
        if element.parent.name in ['style', 'script', 'head', 'title', 'meta', '[document]']:
            continue
        text = str(element).strip()
        if text and len(text) > 1 and not text.isnumeric():
            try:
                translated = translator.translate(text)
                element.replace_with(translated)
            except Exception as e:
                print(f"Failed to translate: {text[:20]}... Error: {e}")
                
    # Update <html lang="en"> to target lang
    if soup.html and soup.html.has_attr('lang'):
        soup.html['lang'] = target_lang[:2]
        
    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    with open(outpath, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print(f"Generated {outpath}")

if __name__ == "__main__":
    base_dir = "."
    html_files = [f for f in os.listdir(base_dir) if f.endswith('.html')]
    
    for lang, name in LANGS.items():
        if lang == 'en': continue
        print(f"Translating to {name} ({lang})...")
        for hf in html_files:
            in_path = os.path.join(base_dir, hf)
            # e.g. site/fr/index.html
            out_path = os.path.join(base_dir, lang[:2], hf) # use fr, zh, etc.
            translate_html_file(in_path, out_path, lang)
