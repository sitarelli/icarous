"""Promuove un livello di prova (levels/test/) a livello ufficiale.

Uso (Mac):  python3 tools/livelli/promuovi.py vitto-02-xxx.js 2
            Copia il file in levels/vitto/level2.js e, se serve, alza "count" di vitto in config.js.
            python3 tools/livelli/promuovi.py originale-13.js 13 originale
            Stessa cosa per la versione Originale: levels/level13.js e "count" di originale.
"""
import os
import re
import shutil
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))

if len(sys.argv) not in (3, 4) or (len(sys.argv) == 4 and sys.argv[3] != 'originale'):
    sys.exit(__doc__)
camp = sys.argv[3] if len(sys.argv) == 4 else 'vitto'
src = os.path.join(ROOT, 'levels', 'test', sys.argv[1])
n = int(sys.argv[2])
dst = os.path.join(ROOT, 'levels', *(['vitto'] if camp == 'vitto' else []), f'level{n}.js')
if not os.path.exists(src):
    sys.exit(f'Non trovo {src}')
shutil.copyfile(src, dst)
print(f'Copiato in {os.path.relpath(dst, ROOT)}')

cfg_path = os.path.join(ROOT, 'config.js')
cfg = open(cfg_path).read()
m = re.search(camp + r": \{.*?count: (\d+)", cfg, re.S)
if m and int(m.group(1)) < n:
    cfg = cfg[:m.start(1)] + str(n) + cfg[m.end(1):]
    open(cfg_path, 'w').write(cfg)
    print(f'config.js: {camp} ora ha {n} livelli')
