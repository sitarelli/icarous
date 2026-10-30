"""Generatore del livello di test AI-01 "Le Nove Stanze" + validatore.

Uso (Mac):  python3 tools/genera_livello_ai01.py
Scrive levels/test/ai-01-nove-stanze.js e stampa il report di validazione.
Il modello segue docs/THESEUS_LEVEL_DESIGN.md: muri a linee, stanze, varchi da 6,
vasche di lava con sponde rialzate, rebus a porte A-B-C con ritorno indietro.
"""
from collections import deque
import os

COLS, ROWS, TS = 72, 46, 9
EMPTY, WALL, LAVA, WOMAN, OPEN, CLOSE, DOOR, FLAG, BULB, THES, KEY, ENH, STAR, ENV, ENS, ENX, TIMER = range(17)

g = [[EMPTY] * COLS for _ in range(ROWS)]

def put(x0, y0, w, h, t, group=None):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            g[y][x] = {'type': t, 'group': group} if group else t

def hline(y, x0, x1): put(x0, y, x1 - x0 + 1, 1, WALL)
def vline(x, y0, y1): put(x, y0, 1, y1 - y0 + 1, WALL)

def tub(x0, x1, lava_top, lava_bottom):
    """Vasca: lava fra x0..x1, righe lava_top..lava_bottom; sponde 1 tile più alte; fondo sotto."""
    put(x0, lava_top, x1 - x0 + 1, lava_bottom - lava_top + 1, LAVA)
    vline(x0 - 1, lava_top - 1, lava_bottom)
    vline(x1 + 1, lava_top - 1, lava_bottom)
    hline(lava_bottom + 1, x0 - 1, x1 + 1)

# --- cornice e griglia 3x3 di stanze (muri spessi 1 tile) ---
hline(0, 0, COLS - 1); hline(ROWS - 1, 0, COLS - 1)
vline(0, 0, ROWS - 1); vline(COLS - 1, 0, ROWS - 1)
vline(24, 0, ROWS - 1); vline(48, 0, ROWS - 1)
hline(15, 0, COLS - 1); hline(30, 0, COLS - 1)

# --- varchi aperti (6 tile) ---
put(24, 39, 1, 6, EMPTY)   # R20 -> R21 (a terra)
put(26, 30, 6, 1, EMPTY)   # R21 -> R11 (in su)
put(63, 30, 6, 1, EMPTY)   # R22 -> R12 (in su)
put(48, 9, 1, 6, EMPTY)    # R02 -> R01 (a terra)
put(24, 9, 1, 6, EMPTY)    # R01 -> R00 (a terra)

# --- porte ---
put(48, 39, 1, 6, DOOR, 'A')   # R21 -> R22
put(50, 15, 6, 1, DOOR, 'B')   # R12 -> R02 (botola nel soffitto)
put(48, 24, 1, 6, DOOR, 'C')   # R12 <-> R11 (scorciatoia)
put(24, 24, 1, 6, DOOR, 'C')   # R11 -> R10 (sacca cieca)

# --- vasche di lava ---
tub(30, 40, 43, 44)    # R21, sul pavimento esterno
tub(53, 60, 28, 29)    # R12, sotto la mensola dell'OPEN C
tub(30, 42, 13, 14)    # R01, da sorvolare prima della ragazza

# --- mensole ---
hline(39, 14, 19)   # R20: prima mensola per imparare a volare
hline(22, 38, 45)   # R11: mensola con OPEN A
hline(21, 52, 58)   # R12: mensola con OPEN C sopra la lava
hline(7, 60, 66)    # R02: mensola con la chiave
hline(8, 4, 10)     # R00: mensola della ragazza

# --- R20 (partenza) ---
put(3, 42, 3, 3, THES)
put(16, 37, 2, 2, STAR)
# --- R21 ---
put(34, 38, 2, 2, STAR)        # stella rischiosa sopra la lava
put(27, 35, 2, 2, ENH)         # pattuglia orizzontale
# --- R11 (sacca con OPEN A) ---
put(41, 20, 2, 2, OPEN, 'A')
put(33, 17, 2, 2, ENV)
put(28, 18, 2, 2, STAR)
# --- R10 (sacca dietro le porte C, con OPEN B) ---
put(3, 28, 2, 2, OPEN, 'B')
put(11, 28, 2, 2, ENS)
put(18, 27, 3, 3, BULB)
put(4, 17, 2, 2, ENH)
# --- R22 (checkpoint) ---
put(51, 43, 2, 2, FLAG)
put(56, 32, 2, 2, ENV)
put(60, 38, 2, 2, ENV)
put(67, 42, 3, 3, BULB)
# --- R12 (OPEN C) ---
put(54, 19, 2, 2, OPEN, 'C')
put(66, 22, 2, 2, ENX)         # righe 22-23: sopra le porte C, non scappa nelle altre stanze
put(67, 18, 2, 2, STAR)
# --- R02 (chiave) ---
put(62, 5, 2, 2, KEY)
put(56, 9, 2, 2, ENS)
put(68, 3, 2, 2, ENV)
put(51, 3, 3, 3, BULB)
# --- R01 (lava + timer) ---
put(44, 12, 3, 3, TIMER)
put(31, 6, 2, 2, ENX)
# --- R00 (ragazza) ---
put(6, 5, 3, 3, WOMAN)
put(15, 3, 2, 2, STAR)

# ====================== VALIDAZIONE ======================
T = lambda c: c['type'] if isinstance(c, dict) else c
G = lambda c: c['group'] if isinstance(c, dict) else None
problems = []

assert len(g) == ROWS and all(len(r) == COLS for r in g)
for x in range(COLS):
    if T(g[0][x]) != WALL or T(g[ROWS-1][x]) != WALL: problems.append('cornice aperta in alto/basso')
for y in range(ROWS):
    if T(g[y][0]) != WALL or T(g[y][COLS-1]) != WALL: problems.append('cornice aperta ai lati')

# entità: blocchi rettangolari, stessi tipi non adiacenti (si fonderebbero)
seen, blocks = set(), []
for y in range(ROWS):
    for x in range(COLS):
        t = T(g[y][x])
        if t in (EMPTY, WALL) or (x, y) in seen: continue
        w = 1
        while x + w < COLS and T(g[y][x+w]) == t and G(g[y][x+w]) == G(g[y][x]): w += 1
        h = 1
        while y + h < ROWS and all(T(g[y+h][x+k]) == t and G(g[y+h][x+k]) == G(g[y][x]) for k in range(w)): h += 1
        for yy in range(y, y+h):
            for xx in range(x, x+w): seen.add((xx, yy))
        blocks.append((t, G(g[y][x]), x, y, w, h))
count = lambda t: sum(1 for b in blocks if b[0] == t)
for t, name in [(THES, 'player'), (KEY, 'chiave'), (WOMAN, 'ragazza')]:
    if count(t) != 1: problems.append(f'{name}: {count(t)} blocchi (serve 1)')

# lava: fondo solido e sponde rialzate
for y in range(ROWS):
    for x in range(COLS):
        if T(g[y][x]) != LAVA: continue
        below = T(g[y+1][x])
        if below not in (WALL, LAVA): problems.append(f'lava senza fondo in {x},{y}')
        for dx in (-1, 1):
            if T(g[y][x+dx]) not in (WALL, LAVA): problems.append(f'lava senza sponda in {x},{y}')
        if T(g[y-1][x]) != LAVA:   # superficie: le sponde devono salire di 1
            xl = x
            while T(g[y][xl-1]) == LAVA: xl -= 1
            xr = x
            while T(g[y][xr+1]) == LAVA: xr += 1
            if T(g[y-1][xl-1]) != WALL or T(g[y-1][xr+1]) != WALL: problems.append(f'sponda bassa vicino a {x},{y}')

# ricerca sugli stati con ingombro 3x3 (porte aperte, chiave)
cells_of = {}
for t, grp, x, y, w, h in blocks:
    cells_of.setdefault((t, grp), []).append((x, y, w, h))
start = cells_of[(THES, None)][0][:2]

def blocked(x, y, open_groups):
    c = g[y][x]
    return T(c) == WALL or (T(c) == DOOR and G(c) not in open_groups)

def region(open_groups):
    ok = lambda x, y: 0 < x < COLS-3 and 0 < y < ROWS-3 and all(not blocked(x+i, y+j, open_groups) for i in range(3) for j in range(3))
    seen, q = {start}, deque([start])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            n = (x+dx, y+dy)
            if n not in seen and ok(*n): seen.add(n); q.append(n)
    return seen

def touches(reg, rect):
    x0, y0, w, h = rect
    return any((px, py) in reg for px in range(x0-2, x0+w) for py in range(y0-2, y0+h))

states, q, solution = {frozenset(): []}, deque([frozenset()]), None
while q:
    st = q.popleft()
    reg = region(st)
    if all(touches(reg, r) for r in cells_of[(KEY, None)]) and touches(reg, cells_of[(WOMAN, None)][0]):
        solution = states[st]; break
    for (t, grp), rects in cells_of.items():
        if t == OPEN and grp not in st and any(touches(reg, r) for r in rects):
            ns = st | {grp}
            if ns not in states: states[ns] = states[st] + [grp]; q.append(ns)

if solution is None: problems.append('NON RISOLVIBILE: ragazza o chiave irraggiungibili')
# la chiave deve richiedere tutte e tre le porte (rebus completo)
if solution is not None and len(solution) < 3: problems.append(f'rebus troppo corto: {solution}')

walls = sum(1 for r in g for c in r if T(c) == WALL)
density = walls / (COLS * ROWS)

# ====================== SCRITTURA ======================
def cell(c):
    return f"{{type:{c['type']},group:'{c['group']}'}}" if isinstance(c, dict) else str(c)

out = os.path.join(os.path.dirname(__file__), '..', 'levels', 'test', 'ai-01-nove-stanze.js')
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'w') as f:
    f.write('/* LEGENDA: 1=Muro 2=Lava 3=Woman 4=Open 5=Close 6=Door 7=Flag 8=Bulb 9=Thes 10=Key 12=Star 16=Timer 11,13,14,15=Enemies */\n')
    f.write('/* AI-01 "Le Nove Stanze" - generato da tools/genera_livello_ai01.py (difficoltà media). */\n')
    f.write('/* Soluzione: OPEN A (stanza centrale) -> porta A -> checkpoint -> OPEN C -> scorciatoia C -> OPEN B (sacca) -> porta B -> chiave -> lava + timer -> ragazza. */\n')
    f.write('loadLevelData({\n    name: "AI-01 · Le Nove Stanze",\n    background: 4,\n')
    f.write(f'    tileSize: {TS},\n    cols: {COLS},\n    rows: {ROWS},\n    map: [\n')
    f.write(',\n'.join('        [' + ','.join(cell(c) for c in r) + ']' for r in g))
    f.write('\n    ]\n});\n')

print(f'Scritto {os.path.normpath(out)}')
print(f'Griglia {COLS}x{ROWS}, densità muri {density:.1%}, blocchi entità {len(blocks)}')
print('Ordine porte trovato dal validatore:', ' -> '.join(solution) if solution else '—')
print('PROBLEMI:' if problems else 'VALIDAZIONE OK', *sorted(set(problems)), sep='\n  ')
