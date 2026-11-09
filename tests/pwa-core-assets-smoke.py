#!/usr/bin/env python3
"""Ensure every precached local resource exists and the root shell is cached."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
sw=(root/'sw.js').read_text()
match=re.search(r'const CORE = \[(.*?)\];',sw,re.S)
assert match, 'CORE list missing'
items=re.findall(r'"([^"]+)"',match.group(1))
missing=[]
for item in items:
    path=item.split('?',1)[0]
    if path in ('./','./index.html'):
        path='index.html'
    path=path.removeprefix('./')
    if not (root/path).is_file(): missing.append(item)
assert './' in items, 'root URL is not precached'
assert './index.html' in items, 'index.html is not precached'
assert not missing, f'missing precache resources: {missing}'
print(f'PWA precache asset smoke: {len(items)} entries exist; root and index are cached')
