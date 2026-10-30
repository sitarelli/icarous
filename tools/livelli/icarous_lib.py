"""Libreria comune per costruire, controllare e salvare i livelli di Icarous.

Ogni livello è uno script corto che usa questa libreria, ad esempio:

    from icarous_lib import *
    L = Level(cols=72, rows=46, tile=9)
    L.frame()
    L.vline(24, 0, 45)
    L.tub(30, 40, 43, 44)
    L.put(3, 42, 3, 3, THES)
    ...
    L.check()                                  # stampa il report, si ferma se ci sono errori
    L.save('vitto-02-xxx.js', name='...', intro='...', background=5)

Regole del motore e del level design: docs/THESEUS_LEVEL_DESIGN.md
Coordinate: x = colonna (0 a sinistra), y = riga (0 in alto). Tutto in tile.
"""
from collections import deque
import json
import os
import re
import sys

EMPTY, WALL, LAVA, WOMAN, OPEN, CLOSE, DOOR, FLAG, BULB, THES, KEY, ENH, STAR, ENV, ENS, ENX, TIMER, WISP = range(18)
NAMES = {WALL: 'muro', LAVA: 'lava', WOMAN: 'ragazza', OPEN: 'OPEN', CLOSE: 'CLOSE', DOOR: 'porta', FLAG: 'cagnolino',
         BULB: 'lampadina', THES: 'Theseus', KEY: 'chiave', ENH: 'nemico H', STAR: 'stella', ENV: 'nemico V',
         ENS: 'nemico S', ENX: 'nemico X', TIMER: 'timer', WISP: 'fuoco fatuo'}

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
TEST_DIR = os.path.join(ROOT, 'levels', 'test')


def T(c): return c['type'] if isinstance(c, dict) else c
def G(c): return c.get('group') if isinstance(c, dict) else None


class Level:
    def __init__(self, cols, rows, tile=9):
        self.cols, self.rows, self.tile = cols, rows, tile
        self.g = [[EMPTY] * cols for _ in range(rows)]
        self.errors, self.warnings, self.solution = [], [], None

    # ------------------------------------------------------------------ disegno
    def put(self, x0, y0, w, h, t, group=None):
        """Riempie un rettangolo w×h a partire da (x0, y0). Le entità sono blocchi: Theseus 3×3, chiave 2×2..."""
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                self.g[y][x] = {'type': t, 'group': group} if group else t

    def hline(self, y, x0, x1): self.put(x0, y, x1 - x0 + 1, 1, WALL)
    def vline(self, x, y0, y1): self.put(x, y0, 1, y1 - y0 + 1, WALL)
    def clear(self, x0, y0, w, h): self.put(x0, y0, w, h, EMPTY)

    def frame(self):
        """Cornice esterna di muri (obbligatoria)."""
        self.hline(0, 0, self.cols - 1); self.hline(self.rows - 1, 0, self.cols - 1)
        self.vline(0, 0, self.rows - 1); self.vline(self.cols - 1, 0, self.rows - 1)

    def door(self, x0, y0, w, h, group):
        """Porta di gruppo: verticale (w=1) in un muro verticale, orizzontale (h=1) in un pavimento."""
        self.put(x0, y0, w, h, DOOR, group)

    def tub(self, x0, x1, lava_top, lava_bottom):
        """Vasca di lava fra le colonne x0..x1 e le righe lava_top..lava_bottom.
        Sponde 1 tile più alte della lava e fondo sotto, come vuole il §16 del documento."""
        self.put(x0, lava_top, x1 - x0 + 1, lava_bottom - lava_top + 1, LAVA)
        self.vline(x0 - 1, lava_top - 1, lava_bottom)
        self.vline(x1 + 1, lava_top - 1, lava_bottom)
        self.hline(lava_bottom + 1, x0 - 1, x1 + 1)

    # ------------------------------------------------------------------ controllo
    def _blocks(self):
        seen, blocks = set(), []
        for y in range(self.rows):
            for x in range(self.cols):
                c = self.g[y][x]
                t = T(c)
                if t in (EMPTY, WALL) or (x, y) in seen:
                    continue
                w = 1
                while x + w < self.cols and T(self.g[y][x + w]) == t and G(self.g[y][x + w]) == G(c): w += 1
                h = 1
                while y + h < self.rows and all(T(self.g[y + h][x + k]) == t and G(self.g[y + h][x + k]) == G(c) for k in range(w)): h += 1
                for yy in range(y, y + h):
                    for xx in range(x, x + w): seen.add((xx, yy))
                blocks.append({'t': t, 'g': G(c), 'x': x, 'y': y, 'w': w, 'h': h})
        return blocks

    def check(self, stop_on_error=True):
        """Controlla il livello e stampa il report. Ritorna True se non ci sono errori."""
        g, E, W = self.g, self.errors, self.warnings
        E.clear(); W.clear()
        cols, rows = self.cols, self.rows

        for x in range(cols):
            if T(g[0][x]) != WALL or T(g[rows - 1][x]) != WALL: E.append('cornice aperta in alto o in basso'); break
        for y in range(rows):
            if T(g[y][0]) != WALL or T(g[y][cols - 1]) != WALL: E.append('cornice aperta a sinistra o a destra'); break

        blocks = self._blocks()
        by = lambda t: [b for b in blocks if b['t'] == t]
        for t in (THES, KEY, WOMAN):
            if len(by(t)) != 1: E.append(f"{NAMES[t]}: {len(by(t))} blocchi (ne serve esattamente 1)")
        thes = by(THES)[0] if by(THES) else None
        self._thes = thes
        if thes and (thes['w'], thes['h']) != (3, 3): W.append(f"Theseus è {thes['w']}×{thes['h']}: usa 3×3")
        if not by(FLAG): W.append('nessun cagnolino: il livello non ha checkpoint')
        # da Vitto Levels 03 in poi ogni livello ha il suo fuoco fatuo (entra da fuori, vaga e passa i muri)
        if len(by(WISP)) != 1: W.append(f'fuochi fatui: {len(by(WISP))} (da Vitto Levels 03 in poi ne serve 1 per livello)')
        for b in blocks:   # entità fuse per sbaglio (due oggetti uguali attaccati)
            if b['t'] in (KEY, STAR, BULB, TIMER, FLAG, ENH, ENV, ENS, ENX, WISP) and (b['w'] > 3 or b['h'] > 3):
                W.append(f"{NAMES[b['t']]} enorme {b['w']}×{b['h']} in ({b['x']},{b['y']}): due blocchi uguali attaccati?")

        # lava in vasca con sponde rialzate
        for y in range(rows):
            for x in range(cols):
                if T(g[y][x]) != LAVA: continue
                if T(g[y + 1][x]) not in (WALL, LAVA): E.append(f'lava senza fondo in ({x},{y})')
                if any(T(g[y][x + d]) not in (WALL, LAVA) for d in (-1, 1)): E.append(f'lava senza sponda in ({x},{y})')
                if T(g[y - 1][x]) != LAVA:
                    l = x
                    while T(g[y][l - 1]) == LAVA: l -= 1
                    r = x
                    while T(g[y][r + 1]) == LAVA: r += 1
                    if T(g[y - 1][l - 1]) != WALL or T(g[y - 1][r + 1]) != WALL: W.append(f'sponda bassa vicino a ({x},{y}): ci si brucia sul bordo')

        # porte senza OPEN
        opens = {b['g'] for b in by(OPEN)}
        for grp in sorted({b['g'] for b in by(DOOR)}):
            if grp not in opens: E.append(f'porta del gruppo {grp} senza interruttore OPEN')

        # nemici che pattugliano contro una porta: quando si apre scappano nelle altre stanze
        def scan(x, y, dx, dy):
            while 0 <= x < cols and 0 <= y < rows:
                t = T(g[y][x])
                if t == WALL: return None
                if t == DOOR: return G(g[y][x])
                x += dx; y += dy
            return None
        for b in blocks:
            dirs = {ENH: [(1, 0), (-1, 0)], ENX: [(1, 0), (-1, 0)], ENV: [(0, 1), (0, -1)]}.get(b['t'], [])
            for dx, dy in dirs:
                lanes = range(b['y'], b['y'] + b['h']) if dx else range(b['x'], b['x'] + b['w'])
                for lane in lanes:
                    sx, sy = (b['x'], lane) if dx else (lane, b['y'])
                    grp = scan(sx, sy, dx, dy)
                    if grp:
                        W.append(f"{NAMES[b['t']]} in ({b['x']},{b['y']}) sbatte contro la porta {grp}: aperta, ci passa attraverso")
                        break

        # risolvibilità: ricerca sugli stati (porte aperte) con l'ingombro reale di Theseus
        if thes and by(KEY) and by(WOMAN):
            pw, ph = thes['w'], thes['h']
            def region(open_groups):
                def ok(x, y):
                    if x < 1 or y < 1 or x + pw >= cols or y + ph >= rows: return False
                    for j in range(ph):
                        for i in range(pw):
                            c = g[y + j][x + i]
                            if T(c) == WALL or (T(c) == DOOR and G(c) not in open_groups): return False
                    return True
                start = (thes['x'], thes['y'])
                seen, q = {start}, deque([start])
                while q:
                    x, y = q.popleft()
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        n = (x + dx, y + dy)
                        if n not in seen and ok(*n): seen.add(n); q.append(n)
                return seen
            def touches(reg, b):
                return any((px, py) in reg for px in range(b['x'] - pw + 1, b['x'] + b['w']) for py in range(b['y'] - ph + 1, b['y'] + b['h']))
            key, woman = by(KEY)[0], by(WOMAN)[0]
            states, q = {frozenset(): []}, deque([frozenset()])
            while q:
                st = q.popleft()
                reg = region(st)
                if touches(reg, key) and touches(reg, woman):
                    self.solution = states[st]; break
                for b in by(OPEN):
                    if b['g'] not in st and touches(reg, b):
                        ns = st | {b['g']}
                        if ns not in states: states[ns] = states[st] + [b['g']]; q.append(ns)
            if self.solution is None:
                E.append('NON RISOLVIBILE: chiave o ragazza irraggiungibili (passaggi stretti per un 3×3 o porte bloccate)')
            else:
                self._check_traps(pw, ph, key, woman, by, E)

        # Vitto vuole un CLOSE per ogni gruppo di porte (trappola o "ponte")
        closes = {b['g'] for b in by(CLOSE)}
        for grp in sorted({b['g'] for b in by(DOOR)}):
            if grp not in closes: W.append(f'porta del gruppo {grp} senza CLOSE')

        walls = sum(1 for r in g for c in r if T(c) == WALL) / (cols * rows)
        if walls > 0.2: W.append(f'densità muri {walls:.0%}: stanze troppo piene?')

        count = lambda t: len(by(t))
        print(f'Livello {cols}×{rows}, tile {self.tile}, muri {walls:.1%}')
        print(f'Ricariche: {count(BULB)} lampadine, {count(STAR)} stelle, {count(TIMER)} timer · '
              f'Nemici: {count(ENH)} H, {count(ENV)} V, {count(ENX)} X, {count(ENS)} S, {count(WISP)} fuoco fatuo · Cagnolini: {count(FLAG)}')
        if self.solution is not None:
            print('Ordine porte necessario:', ' -> '.join(self.solution) if self.solution else 'nessuna porta')
        for w in dict.fromkeys(W): print('  ATTENZIONE:', w)
        for e in dict.fromkeys(E): print('  ERRORE:', e)
        print('CONTROLLO OK' if not E else 'CI SONO ERRORI')
        if E and stop_on_error: sys.exit(1)
        return not E

    def _check_traps(self, pw, ph, key, woman, by, E):
        """Anti-blocco con i CLOSE: esplora tutti gli stati (porte aperte, chiave presa, dove si trova Theseus)
        premendo OPEN e CLOSE in qualsiasi ordine. Se da uno stato raggiungibile non si può più vincere,
        un CLOSE può chiudere il giocatore in trappola per sempre: è un ERRORE."""
        g, cols, rows = self.g, self.cols, self.rows
        def ok(x, y, open_groups):
            if x < 1 or y < 1 or x + pw >= cols or y + ph >= rows: return False
            for j in range(ph):
                for i in range(pw):
                    c = g[y + j][x + i]
                    if T(c) == WALL or (T(c) == DOOR and G(c) not in open_groups): return False
            return True
        cache = {}
        def region(open_groups, pos):
            for reg in cache.get(open_groups, []):
                if pos in reg: return reg
            seen, q = {pos}, deque([pos])
            while q:
                x, y = q.popleft()
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    n = (x + dx, y + dy)
                    if n not in seen and ok(*n, open_groups): seen.add(n); q.append(n)
            reg = frozenset(seen)
            cache.setdefault(open_groups, []).append(reg)
            return reg
        def touch_pos(reg, b):
            for px in range(b['x'] - pw + 1, b['x'] + b['w']):
                for py in range(b['y'] - ph + 1, b['y'] + b['h']):
                    if (px, py) in reg: return (px, py)
            return None
        switches = [(b, True) for b in by(OPEN)] + [(b, False) for b in by(CLOSE)]
        start_pos = (self._thes['x'], self._thes['y'])
        start = (frozenset(), False, region(frozenset(), start_pos))
        states, edges, q = {start: None}, {}, deque([start])
        while q:
            st = q.popleft()
            opn, has_key, reg = st
            nexts = []
            if not has_key and touch_pos(reg, key): nexts.append(((opn, True, reg), 'chiave'))
            for b, is_open in switches:
                p = touch_pos(reg, b)
                if not p: continue
                ns = opn | {b['g']} if is_open else opn - {b['g']}
                if ns == opn: continue
                # il giocatore resta dov'era il pulsante: se la porta si chiude davanti, è dall'altra parte
                stays = p if ok(*p, ns) else None
                if stays is None: continue
                nexts.append(((ns, has_key, region(ns, stays)), ('OPEN ' if is_open else 'CLOSE ') + b['g']))
            edges[st] = nexts
            for ns, label in nexts:
                if ns not in states: states[ns] = (st, label); q.append(ns)
        win = {s for s in states if s[1] and touch_pos(s[2], woman)}
        can_win, changed = set(win), True
        while changed:
            changed = False
            for s, nexts in edges.items():
                if s not in can_win and any(n in can_win for n, _ in nexts):
                    can_win.add(s); changed = True
        stuck = [s for s in states if s not in can_win]
        if stuck:
            s = min(stuck, key=lambda s: len(s[0]))
            path = []
            while states[s]: s, label = states[s]; path.append(label)
            E.append('TRAPPOLA SENZA USCITA: premendo ' + ' -> '.join(reversed(path)) + ' il giocatore resta bloccato')
        self.trap_states = len(states)

    # ------------------------------------------------------------------ salvataggio
    def to_js(self, name='', intro='', background=None, comment=''):
        cell = lambda c: f"{{type:{c['type']},group:'{c['group']}'}}" if isinstance(c, dict) else str(c)
        js = '/* LEGENDA: 1=Muro 2=Lava 3=Woman 4=Open 5=Close 6=Door 7=Flag 8=Bulb 9=Thes 10=Key 12=Star 16=Timer 11,13,14,15=Enemies 17=Fuoco fatuo */\n'
        for line in comment.strip().splitlines():
            js += f'/* {line.strip()} */\n'
        js += 'loadLevelData({\n'
        if name: js += f'    name: {json.dumps(name, ensure_ascii=False)},\n'
        if intro: js += f'    intro: {json.dumps(intro, ensure_ascii=False)},\n'
        if background: js += f'    background: {background},\n'
        js += f'    tileSize: {self.tile},\n    cols: {self.cols},\n    rows: {self.rows},\n    map: [\n'
        js += ',\n'.join('        [' + ','.join(cell(c) for c in r) + ']' for r in self.g)
        js += '\n    ]\n});\n'
        return js

    def save(self, filename, name='', intro='', background=None, comment='', note=''):
        """Salva in levels/test/<filename> e lo aggiunge all'elenco del laboratorio (test.html)."""
        path = os.path.join(TEST_DIR, filename)
        with open(path, 'w') as f:
            f.write(self.to_js(name, intro, background, comment))
        _add_to_lab_list(filename, name or filename, note)
        print(f'Salvato {os.path.relpath(path, ROOT)} · aprilo da test.html')
        return path


def _add_to_lab_list(filename, name, note):
    path = os.path.join(TEST_DIR, 'elenco.js')
    text = open(path).read()
    if json.dumps(filename) in text or f"'{filename}'" in text:
        return
    entry = '    { file: %s, name: %s, author: "Vitto + Claude", note: %s }' % (
        json.dumps(filename), json.dumps(name, ensure_ascii=False), json.dumps(note, ensure_ascii=False))
    text = re.sub(r'\n\];', f',\n{entry}\n];', text.rstrip(), count=1) + '\n'
    text = text.replace('[,\n', '[\n')
    with open(path, 'w') as f:
        f.write(text)
