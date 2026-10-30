"""Promuove un livello di prova (levels/test/) a livello ufficiale di Vitto Levels.

Uso (Mac):  python3 tools/livelli/promuovi.py vitto-02-xxx.js 2
Copia il file in levels/vitto/level2.js e, se serve, alza "count" di vitto in config.js.
"""
import os
import re
import shutil
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))

if len(sys.argv) != 3:
    sys.exit(__doc__)
src = os.path.join(ROOT, 'levels', 'test', sys.argv[1])
n = int(sys.argv[2])
dst = os.path.join(ROOT, 'levels', 'vitto', f'level{n}.js')
if not os.path.exists(src):
    sys.exit(f'Non trovo {src}')
shutil.copyfile(src, dst)
print(f'Copiato in {os.path.relpath(dst, ROOT)}')

cfg_path = os.path.join(ROOT, 'config.js')
cfg = open(cfg_path).read()
m = re.search(r"(vitto: \{.*?count: )(\d+)", cfg, re.S)
if m and int(m.group(2)) < n:
    cfg = cfg[:m.start(2)] + str(n) + cfg[m.end(2):]
    open(cfg_path, 'w').write(cfg)
    print(f'config.js: Vitto Levels ora ha {n} livelli')
