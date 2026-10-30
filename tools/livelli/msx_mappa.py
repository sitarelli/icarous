"""Legge la mappa MSX ad alta risoluzione (docs/mappetheseus.png) e ne ricava i livelli originali.

Nella mappa ogni tile MSX è un quadretto di 8×8 pixel; un livello intero è 121×57 tile MSX.
I livelli di Icarous sono 193×90: si scala di circa 1,6 (è la scala usata da Vitto per i livelli 1-12).

Uso (Mac), dalla cartella del gioco:
    python3 tools/livelli/msx_mappa.py 13          # stampa la griglia MSX del livello 13 + le icone trovate
    python3 tools/livelli/msx_mappa.py 13 --scala  # come sopra, con le coordinate già scalate a 193×90
    python3 tools/livelli/msx_mappa.py 12 --confronta  # per ogni icona MSX: cosa c'è lì in levels/level12.js

Da uno script di livello:
    from msx_mappa import disegna_msx, msx_a_icarous
    L = Level(cols=193, rows=90, tile=8)
    disegna_msx(L, 13)                 # cornice, muri, lava e zone fuori mappa (piene di muro)
    x, y = msx_a_icarous(60, 30)       # converte una coordinata MSX in coordinata Icarous

Legenda della griglia stampata: # muro  ~ lava  . vuoto  ? icona (oggetto, nemico, porta...)  spazio = fuori mappa.
Le icone NON vengono riconosciute da sole: l'elenco dice dove sono e di che colore, il ritaglio
in docs/mappe/originale/ dice cosa sono.
"""
from collections import Counter
import os
import struct
import sys
import zlib

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
MAPPA = os.path.join(ROOT, 'docs', 'mappetheseus.png')

# Livello: (x pixel, y pixel dell'angolo in alto a sinistra della cornice, colonne MSX, righe MSX)
PANNELLI = {
    10: (3964, 32, 77, 57),
    11: (3964, 577, 121, 57),
    12: (5157, 32, 121, 57),
    13: (5157, 577, 121, 57),
}
COLS, ROWS = 193, 90
MURO, LAVA_C = (200, 200, 200), ((208, 80, 72), (247, 120, 120))
NERO, FUORI = (0, 0, 0), (6, 6, 6)
COLORI = {(64, 232, 240): 'azzurro', (255, 255, 255): 'bianco', (247, 247, 247): 'bianco', (252, 254, 252): 'bianco',
          (32, 200, 64): 'verde', (32, 176, 56): 'verde', (88, 216, 120): 'verde chiaro', (80, 80, 232): 'blu',
          (208, 192, 80): 'giallo', (224, 200, 128): 'giallo', (247, 80, 80): 'rosso', (208, 208, 208): 'grigio'}


def _leggi_png(path):
    d = open(path, 'rb').read(); p = 8; idat = b''; pal = None
    while p < len(d):
        n, t = struct.unpack('>I4s', d[p:p + 8]); c = d[p + 8:p + 8 + n]; p += 12 + n
        if t == b'IHDR': w, h, _, ct = struct.unpack('>IIBB', c[:10])
        elif t == b'PLTE': pal = [tuple(c[i:i + 3]) for i in range(0, len(c), 3)]
        elif t == b'IDAT': idat += c
    if ct != 3:
        sys.exit('La mappa deve essere un PNG a palette (come docs/mappetheseus.png)')
    raw = zlib.decompress(idat); rows = []; prev = bytearray(w); i = 0
    for _ in range(h):
        f = raw[i]; line = bytearray(raw[i + 1:i + 1 + w]); i += 1 + w
        for x in range(w):
            a = line[x - 1] if x else 0; b = prev[x]; c = prev[x - 1] if x else 0
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + b) & 255
            elif f == 3: line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line); prev = line
    return pal, rows


def griglia_msx(n):
    """Griglia MSX del livello n: lista di stringhe (# ~ . ? spazio) + colori dominanti delle celle '?'."""
    if n not in PANNELLI:
        sys.exit(f'Livello {n} non mappato: aggiungi le coordinate del pannello in PANNELLI')
    pal, px = _leggi_png(MAPPA)
    x0, y0, C, R = PANNELLI[n]
    g, colori = [], {}
    for r in range(R):
        s = ''
        for c in range(C):
            cnt = Counter(pal[px[y0 + r * 8 + j][x0 + c * 8 + i]] for j in range(8) for i in range(8))
            if cnt[MURO] >= 20: s += '#'
            elif sum(cnt[k] for k in LAVA_C) >= 20: s += '~'
            elif cnt[NERO] + cnt[FUORI] >= 60: s += '.'
            else:
                s += '?'
                altri = [(k, v) for k, v in cnt.most_common() if k not in (NERO, FUORI, MURO)]
                colori[(c, r)] = COLORI.get(altri[0][0], str(altri[0][0])) if altri else '?'
        g.append(s)
    # pulizia: nell'MSX i muri stanno su righe o colonne multiple di 4 (il resto sono icone grigie, es. i rombi)
    # e la lava è sempre a vasche larghe almeno 4 (un pezzetto rosso isolato è un pezzo di icona)
    orig = list(g); g = [list(s) for s in g]
    for r in range(R):
        for c in range(C):
            if g[r][c] == '#' and r % 4 and c % 4:
                g[r][c] = '?'; colori[(c, r)] = 'grigio'
            elif g[r][c] == '~' and _run(orig[r], c) < 4:
                g[r][c] = '?'; colori[(c, r)] = 'rosso'
    # fuori mappa: le celle vuote raggiungibili dal bordo senza attraversare muri (i livelli non rettangolari)
    coda = [(c, r) for r in range(R) for c in range(C) if (r in (0, R - 1) or c in (0, C - 1)) and g[r][c] == '.']
    while coda:
        c, r = coda.pop()
        if 0 <= r < R and 0 <= c < C and g[r][c] == '.':
            g[r][c] = ' '
            coda += [(c + 1, r), (c - 1, r), (c, r + 1), (c, r - 1)]
    return [''.join(s) for s in g], colori


def _run(riga, c):
    """Lunghezza del tratto di '~' che contiene la colonna c."""
    a = b = c
    while a > 0 and riga[a - 1] == '~': a -= 1
    while b + 1 < len(riga) and riga[b + 1] == '~': b += 1
    return b - a + 1


def _sx(c): return min(COLS - 1, round(c * (COLS - 1) / 120))
def _sy(r): return min(ROWS - 1, round(r * (ROWS - 1) / 56))


def msx_a_icarous(c, r):
    """Coordinata MSX (colonna, riga) -> coordinata Icarous 193×90."""
    return _sx(c), _sy(r)


def icone(g, colori):
    """Raggruppa le celle '?' vicine in icone: [(colonna, riga, larghezza, altezza, colore)] in coordinate MSX."""
    visti, out = set(), []
    for (c, r) in sorted(colori, key=lambda k: (k[1], k[0])):
        if (c, r) in visti: continue
        coda, blocco = [(c, r)], []
        visti.add((c, r))
        while coda:
            a, b = coda.pop(); blocco.append((a, b))
            for da in (-1, 0, 1):
                for db in (-1, 0, 1):
                    k = (a + da, b + db)
                    if k in colori and k not in visti: visti.add(k); coda.append(k)
        xs = [k[0] for k in blocco]; ys = [k[1] for k in blocco]
        col = Counter(colori[k] for k in blocco).most_common(1)[0][0]
        out.append((min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1, col))
    return out


def disegna_msx(L, n):
    """Disegna su L (193×90) cornice, muri e lava del livello originale n, scalati da MSX.
    Le zone fuori mappa diventano muro pieno. Porte, interruttori, oggetti e nemici vanno messi a mano."""
    from icarous_lib import WALL, LAVA
    g, _ = griglia_msx(n)
    R, C = len(g), len(g[0])
    cella = lambda c, r: g[r][c] if 0 <= r < R and 0 <= c < C else ' '
    # fuori mappa: ogni tile Icarous che ricade in una cella MSX "fuori" diventa muro
    for y in range(L.rows):
        for x in range(L.cols):
            if cella(round(x * 120 / (COLS - 1)), round(y * 56 / (ROWS - 1))) == ' ':
                L.g[y][x] = WALL
    for r in range(R):          # muri orizzontali
        c = 0
        while c < C:
            if g[r][c] == '#':
                e = c
                while e + 1 < C and g[r][e + 1] == '#': e += 1
                L.hline(_sy(r), _sx(c), _sx(e)); c = e + 1
            else: c += 1
    for c in range(C):          # muri verticali
        r = 0
        while r < R:
            if g[r][c] == '#':
                e = r
                while e + 1 < R and g[e + 1][c] == '#': e += 1
                L.vline(_sx(c), _sy(r), _sy(e)); r = e + 1
            else: r += 1
    for r in range(R):          # lava: riempie lo spazio fra i muri scalati attorno a ogni cella
        for c in range(C):
            if g[r][c] == '~':
                for y in range(_sy(r - 1) + 1, _sy(r + 1)):
                    for x in range(_sx(c - 1) + 1, _sx(c + 1)):
                        if L.g[y][x] != WALL: L.g[y][x] = LAVA


def confronta(n):
    """Per ogni icona della mappa MSX dice cosa c'è nello stesso punto di levels/level<n>.js (raggio 2 tile)."""
    import json, re
    nomi = {3: 'ragazza', 4: 'OPEN', 5: 'CLOSE', 6: 'porta', 7: 'cagnolino', 8: 'lampadina', 9: 'Theseus', 10: 'chiave',
            11: 'nemico H', 12: 'stella', 13: 'nemico V', 14: 'nemico S', 15: 'nemico X', 16: 'timer', 17: 'fuoco fatuo'}
    t = open(os.path.join(ROOT, 'levels', f'level{n}.js')).read()
    m = t[t.index('map:') + 4:]; m = m[:m.rindex(']') + 1]
    m = re.sub(r"\{\s*type:\s*(\d+)\s*,\s*group:\s*'(\w+)'\s*\}", r'"\1 \2"', m)
    M = json.loads(re.sub(r',\s*\]', ']', m))
    g, colori = griglia_msx(n)
    fx, fy = (len(M[0]) - 1) / (len(g[0]) - 1), (len(M) - 1) / (len(g) - 1)
    print(f'Livello {n}: icone della mappa MSX e cosa c\'è nello stesso punto del file attuale')
    for c, r, w, h, col in icone(g, colori):
        trovati = Counter()
        for y in range(round(r * fy) - 2, round((r + h) * fy) + 2):
            for x in range(round(c * fx) - 2, round((c + w) * fx) + 2):
                if 0 <= y < len(M) and 0 <= x < len(M[0]):
                    v = M[y][x]; k = int(str(v).split()[0])
                    if k in nomi: trovati[nomi[k] + (' ' + str(v).split()[1] if isinstance(v, str) else '')] += 1
        x, y = round(c * fx), round(r * fy)
        print(f'  MSX ({c:3},{r:2}) -> ({x:3},{y:2})  {w}×{h} {col:12} ' + (', '.join(trovati) if trovati else '--- NIENTE ---'))


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[2] == '--confronta':
        confronta(int(sys.argv[1])); sys.exit()
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    n = int(sys.argv[1]); scala = '--scala' in sys.argv
    g, colori = griglia_msx(n)
    print(f'Livello {n}: griglia MSX {len(g[0])}×{len(g)}  (# muro, ~ lava, . vuoto, ? icona, spazio = fuori mappa)')
    print('    ' + ''.join(str(c // 10 % 10) if c % 10 == 0 else ' ' for c in range(len(g[0]))))
    for r, s in enumerate(g):
        print(f'{r:3} {s}')
    print('\nIcone (coordinate MSX colonna,riga · dimensione · colore' + (' · in Icarous 193×90' if scala else '') + '):')
    for c, r, w, h, col in icone(g, colori):
        extra = '  -> Icarous (%d,%d)' % msx_a_icarous(c, r) if scala else ''
        print(f'  ({c:3},{r:2})  {w}×{h}  {col}{extra}')
