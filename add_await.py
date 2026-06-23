#!/usr/bin/env python3
"""
Adds `await` in front of every db.prepare(...).get/all/run() call
that doesn't already have one.

Usage:
  python3 add_await.py backend/src/auth.js
  python3 add_await.py backend/src/routes/*.js
"""
import re
import sys
import glob

def process(content):
    # Match db.prepare(`...`).get/all/run( possibly across lines
    # Insert `await ` if not already preceded by await
    pattern = re.compile(
        r'(?<![a-zA-Z0-9_$])(db\.prepare\(`(?:[^`]|\n)*?`\)\s*\.\s*(?:get|all|run)\s*\()',
        re.MULTILINE
    )

    def replacer(m):
        start = m.start()
        # Check if 'await ' immediately precedes this match in the string
        preceding = content[max(0, start-6):start]
        if 'await ' in preceding or 'await\t' in preceding:
            return m.group(0)
        return 'await ' + m.group(0)

    return pattern.sub(replacer, content)

files = []
for arg in sys.argv[1:]:
    files.extend(glob.glob(arg))

total_changes = 0
for fname in files:
    with open(fname, 'r') as f:
        original = f.read()
    updated = process(original)
    if updated != original:
        with open(fname, 'w') as f:
            f.write(updated)
        added = updated.count('await db.prepare') - original.count('await db.prepare')
        print(f"  ✅ {fname}: +{added} awaits")
        total_changes += 1
    else:
        print(f"  — {fname}: no changes needed")

print(f"\nDone. Modified {total_changes} file(s).")
