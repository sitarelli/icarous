/* -------------------------------------------------------------------------- */
/* FISICA E LOGICA DEL PLAYER                                                 */
/* -------------------------------------------------------------------------- */
// Tutto ciò che si muove viene aggiornato qui, a passo fisso (60 volte al secondo),
// così la velocità del gioco non dipende dalla frequenza dello schermo (60/120 Hz).

import { config, keys, player, gameState, camera, currentMap, items, enemies, lavas, triggers, decorations, lavaParticles, dustParticles, fireworkParticles, colorParticles, featherParticles, deathParticles, cameraShake, lavaAnimTime, fx, isMobile, timerPowerUp } from './config.js';
import { safePlayAudio, sfx, playSound, stopAllSounds, playWispSound } from './main.js';

// Tile solido: muro (1) oppure porta chiusa
export function getTile(px, py) {
    const tx = Math.floor(px / config.tileSize);
    const ty = Math.floor(py / config.tileSize);

    if (ty < 0 || ty >= currentMap.length || tx < 0 || tx >= currentMap[0].length) return 1;
    if (currentMap[ty][tx] === 1) return 1;

    for (let t of triggers) {
        if (t.type === 'door' && !t.open && px >= t.x && px < t.x + t.w && py >= t.y && py < t.y + t.h) {
            return 1;
        }
    }
    return 0;
}

export function rectIntersect(r1, r2, useMargin = false) {
    let m1 = 0, m2 = 0;
    if (useMargin) {
        m1 = r1.w * config.hitboxMargin;
        m2 = r2.w * config.hitboxMargin;
    }
    return !(
        (r2.x + m2) > (r1.x + r1.w - m1) ||
        (r2.x + r2.w - m2) < (r1.x + m1) ||
        (r2.y + m2) > (r1.y + r1.h - m1) ||
        (r2.y + r2.h - m2) < (r1.y + m1)
    );
}

export function respawnPlayer() {
    player.x = player.startX;
    player.y = player.startY;
    player.vx = 0;
    player.vy = 0;
    player.damageCooldown = 0;
    player.canFly = true;
    player.bumped = false;
    player.squash = 0;
    player.isDying = false;
    player.deathFrame = 0;
    player.deathMode = '';
    player.deathTime = 0;
    player.deathRot = 0;
    player.puddle = 0;
    player.isInLava = false;
    deathParticles.length = 0;
}

// ===== FUOCO FATUO (tile 17): spirito di lava che compare a un punto del livello, poi vaga a caso =====
// Il blocco 17 nella mappa è il punto dove si materializza: dorme finché Icarous non ci arriva vicino,
// poi compare con un'animazione e vaga a caso; se va contro un muro o una porta chiusa cambia direzione.
const WISP_SPEED = 0.121;     // tile per frame (gli altri nemici vanno a 0.20)
const WISP_WAKE_RANGE = 14;   // tile: quanto vicino deve arrivare Icarous per farlo comparire
export const WISP_APPEAR_TIME = 1.4;
const WISP_CHASE = 0.022;     // quanto tende verso Icarous (0 = del tutto a caso)
const WISP_FREE_TIME = 0.6;   // dopo un rimbalzo vaga libero per un attimo prima di tornare a inseguire

// "Mappa delle distanze" da Icarous attraverso le stanze (muri e porte chiuse bloccano), ricalcolata ogni mezzo secondo:
// il fuoco fatuo segue la strada vera fino a lui, non la linea d'aria (che in un labirinto lo farebbe solo sbattere).
let wispField = null, wispFieldW = 0, wispFieldTimer = 0;
function updateWispField(dt) {
    wispFieldTimer -= dt;
    if (wispField && wispFieldTimer > 0) return;
    wispFieldTimer = 0.5;
    const ts = config.tileSize, W = currentMap[0].length, H = currentMap.length;
    if (!wispField || wispField.length !== W * H) wispField = new Int32Array(W * H);
    wispFieldW = W;
    const solid = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) solid[y * W + x] = currentMap[y][x] === 1 ? 1 : 0;
    triggers.forEach(t => {
        if (t.type !== 'door' || t.open) return;
        for (let y = Math.floor(t.y / ts); y < Math.ceil((t.y + t.h) / ts); y++)
            for (let x = Math.floor(t.x / ts); x < Math.ceil((t.x + t.w) / ts); x++) solid[y * W + x] = 1;
    });
    wispField.fill(-1);
    const sx = Math.floor((player.x + player.w / 2) / ts), sy = Math.floor((player.y + player.h / 2) / ts);
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;
    const queue = new Int32Array(W * H);
    let head = 0, tail = 0;
    wispField[sy * W + sx] = 0;
    queue[tail++] = sy * W + sx;
    while (head < tail) {
        const i = queue[head++], x = i % W, d = wispField[i] + 1;
        if (x > 0 && !solid[i - 1] && wispField[i - 1] < 0) { wispField[i - 1] = d; queue[tail++] = i - 1; }
        if (x < W - 1 && !solid[i + 1] && wispField[i + 1] < 0) { wispField[i + 1] = d; queue[tail++] = i + 1; }
        if (i >= W && !solid[i - W] && wispField[i - W] < 0) { wispField[i - W] = d; queue[tail++] = i - W; }
        if (i < W * (H - 1) && !solid[i + W] && wispField[i + W] < 0) { wispField[i + W] = d; queue[tail++] = i + W; }
    }
}

// Dove puntare: scende la mappa delle distanze per qualche passo e mira a quel punto (null = Icarous irraggiungibile)
function wispChaseTarget(cx, cy) {
    if (!wispField) return null;
    const ts = config.tileSize, W = wispFieldW;
    let x = Math.floor(cx / ts), y = Math.floor(cy / ts);
    let i = y * W + x;
    if (i < 0 || i >= wispField.length || wispField[i] < 0) return null;
    for (let step = 0; step < 5; step++) {
        let best = i;
        for (const n of [i - 1, i + 1, i - W, i + W]) if (n >= 0 && n < wispField.length && wispField[n] >= 0 && wispField[n] < wispField[best]) best = n;
        if (best === i) break;
        i = best;
    }
    return { x: (i % W + 0.5) * ts, y: (Math.floor(i / W) + 0.5) * ts };
}   // secondi di animazione (intanto non fa danno)

// blue = fuoco fatuo blu (tile 18): uguale al rosso, ma si sveglia solo dopo che il rosso è già comparso
export function createWisp(x, y, w, h, blue = false) {
    const en = { x, y, w, h, vx: 0, vy: 0, type: 'W', blue, homeX: x, homeY: y, seed: Math.random() * 100, trail: [] };
    putWispToSleep(en, 0);
    return en;
}

// Torna a dormire nel suo punto; si risveglia quando Icarous torna vicino (non prima di "delay" secondi)
function putWispToSleep(en, delay) {
    en.x = en.homeX;
    en.y = en.homeY;
    en.state = 'dormant';
    en.wait = delay;
    en.appear = 0;
    en.angle = Math.random() * Math.PI * 2;
    en.turn = 0;
    en.free = 0;
    en.trail.length = 0;
}

// Il corpo del fuoco fatuo a (x, y) tocca un muro o una porta chiusa? (controlla bordi e centro dei lati)
function wispHits(en, x, y) {
    const r = x + en.w - 1, b = y + en.h - 1, mx = x + en.w / 2, my = y + en.h / 2;
    return getTile(x, y) || getTile(r, y) || getTile(x, b) || getTile(r, b) ||
        getTile(mx, y) || getTile(mx, b) || getTile(x, my) || getTile(r, my);
}

function steerTo(en, angle, k) {
    const diff = Math.atan2(Math.sin(angle - en.angle), Math.cos(angle - en.angle));
    en.angle += diff * k;
}

function updateWisp(en, dt, dm) {
    const ts = config.tileSize;
    const cx = en.x + en.w / 2, cy = en.y + en.h / 2;
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    if (en.state === 'dormant') {
        if (en.wait > 0) { en.wait -= dt; return; }
        // il blu aspetta che il rosso sia comparso almeno una volta (anche se poi è tornato a dormire dopo una morte)
        if (en.blue && !enemies.some(o => o.type === 'W' && !o.blue && o.woke)) return;
        if (Math.hypot(px - cx, py - cy) < ts * WISP_WAKE_RANGE) {
            en.state = 'appearing';
            en.woke = true;
            en.appear = 0;
            addCameraShake(5);
            createColorParticles(cx, cy, 16, 'hit');
            try { playWispSound(); } catch (e) {}
        }
        return;
    }
    if (en.state === 'appearing') {
        // si materializza sul posto: braci che convergono, anello di fuoco, poi si gonfia
        en.appear += dt / WISP_APPEAR_TIME;
        if (en.appear >= 1) { en.appear = 1; en.state = 'active'; }
        return;
    }
    const speed = WISP_SPEED * ts;
    // vagare: la curva cambia piano piano, a caso
    en.turn = Math.max(-0.045, Math.min(0.045, en.turn + (Math.random() - 0.5) * 0.02 * dm));
    en.angle += en.turn * dm;
    // tendenza verso Icarous, ovunque sia: va a caso ma "scivola" sempre dalla sua parte, seguendo la strada vera
    if (en.free > 0) en.free -= dt;
    else {
        const target = wispChaseTarget(cx, cy) || { x: px, y: py };
        steerTo(en, Math.atan2(target.y - cy, target.x - cx), WISP_CHASE * dm);
    }
    en.vx = Math.cos(en.angle) * speed;
    en.vy = Math.sin(en.angle) * speed;
    // muri e porte chiuse: si muove un asse alla volta e, se urta, rimbalza su quell'asse
    const nx = en.x + en.vx * dm;
    if (wispHits(en, nx, en.y)) { en.angle = Math.PI - en.angle; en.turn = -en.turn; en.free = WISP_FREE_TIME; }
    else en.x = nx;
    const ny = en.y + en.vy * dm;
    if (wispHits(en, en.x, ny)) { en.angle = -en.angle; en.turn = -en.turn; en.free = WISP_FREE_TIME; }
    else en.y = ny;
    // scia: le ultime posizioni, per disegnare la coda
    en.trailTimer = (en.trailTimer || 0) + dm;
    if (en.trailTimer >= 3) {
        en.trailTimer = 0;
        en.trail.unshift({ x: cx, y: cy });
        if (en.trail.length > 6) en.trail.pop();
    }
}

// Riparte dall'ultima bandiera toccata, conservando chiave, porte e oggetti presi
export function respawnAtCheckpoint() {
    const cp = gameState.checkpoint;
    if (!cp) return false;
    respawnPlayer();
    // il fuoco fatuo non deve trovarsi addosso a chi riparte: torna a dormire nel suo punto e ricompare più tardi
    enemies.forEach(en => { if (en.type === 'W') putWispToSleep(en, 3); });
    player.x = cp.x;
    player.y = cp.y;
    player.damageCooldown = 2.0;   // un attimo di invulnerabilità alla ripartenza
    gameState.power = Math.max(cp.power, 0.5);
    gameState.gameOver = false;
    gameState.levelStats.deaths++;
    timerPowerUp.active = false;
    timerPowerUp.timeLeft = 0;
    addFloatText(player.x + player.w / 2, player.y - config.tileSize, 'CHECKPOINT', '#7CFFB2');
    return true;
}

export function playerDie() {
    if (player.isDying || gameState.gameOver || gameState.god) return;

    player.isDying = true;
    player.deathFrame = 0;
    player.frameTimer = 0;
    player.deathTime = 0;
    player.deathRot = 0;
    player.puddle = 0;
    player._lavaWasPlaying = false;  // reset so lava sound can replay next life
    // A terra (o nella lava) la cera si scioglie sul posto; in volo le ali cedono e precipita
    player.deathMode = isGrounded() || player.isInLava ? 'melt' : 'fall';
    player.vx *= 0.5;
    if (player.vy < 0) player.vy *= 0.3;

    if (player.deathMode === 'melt') {
        addCameraShake(5);
        createColorParticles(player.x + player.w / 2, player.y + player.h * 0.5, 14, 'hit');
    }
    const cx = player.x + player.w / 2;
    for (let i = 0; i < 8; i++) createFeather(cx + (Math.random() - 0.5) * player.w * 0.8, player.y + player.h * 0.35, true);

    stopAllSounds();
    safePlayAudio(sfx.death);
}

// Ha un pavimento (muro o porta chiusa) subito sotto i piedi?
function isGrounded() {
    const y = player.y + player.h + 1;
    return [4, player.w / 2, player.w - 4].some(p => getTile(player.x + p, y));
}

/* ===================== ANIMAZIONE DI MORTE ===================== */
const MELT_TIME = 2.6;      // secondi per sciogliersi a terra
const FALL_MAX_TIME = 3.5;  // dopo questo tempo in caduta si sbriciola comunque
const CRUMBLE_TIME = 1.8;   // secondi di frammenti e polvere prima del game over
const PIECES_X = 5, PIECES_Y = 6;

function deathFx(p) {
    if (deathParticles.length < (isMobile ? 160 : 260)) deathParticles.push(p);
}

function steamPuff(x, y, big = false) {
    const ts = config.tileSize;
    deathFx({ kind: 'steam', x, y, vx: (Math.random() - 0.5) * 0.15, vy: -(0.2 + Math.random() * 0.3),
              size: ts * (big ? 0.45 : 0.25) * (0.7 + Math.random() * 0.6), life: 1, decay: 0.01 + Math.random() * 0.008 });
}

function updateDeath(dt, dm, hooks) {
    player.deathTime += dt;
    const ts = config.tileSize;
    const cx = player.x + player.w / 2;
    const floorY = player.y + player.h;

    if (player.deathMode === 'melt') {
        // La cera cola: gocce che scendono alla base, vapore e braci, la pozza si allarga
        const t = Math.min(1, player.deathTime / MELT_TIME);
        player.deathFrame = Math.min(7, Math.floor(t * 8.5));
        const grow = Math.min(1, Math.max(0, (t - 0.12) / 0.75));
        player.puddle = player.w * (0.25 + 0.65 * (1 - (1 - grow) * (1 - grow)));
        if (t < 0.85 && Math.random() < 0.45 * dm) {
            deathFx({ kind: 'drop', x: player.x + player.w * (0.22 + Math.random() * 0.56), y: player.y + player.h * (0.25 + Math.random() * 0.5),
                      vy: 0, floorY: floorY - 0.5, size: ts * (0.09 + Math.random() * 0.08), life: 1 });
        }
        if (Math.random() < (t < 0.6 ? 0.12 : 0.05) * dm) steamPuff(cx + (Math.random() - 0.5) * player.w * 0.8, player.y + player.h * (0.3 + Math.random() * 0.6), player.isInLava);
        if (t < 0.55 && Math.random() < 0.25 * dm) {
            deathFx({ kind: 'ember', x: cx + (Math.random() - 0.5) * player.w * 0.7, y: player.y + player.h * (0.3 + Math.random() * 0.6),
                      vx: (Math.random() - 0.5) * 0.3, vy: -(0.3 + Math.random() * 0.5), size: ts * (0.08 + Math.random() * 0.08), life: 1, decay: 0.02 });
        }
        if (Math.random() < 0.04 * dm) createFeather(cx + (Math.random() - 0.5) * player.w * 0.6, player.y + player.h * 0.4, true);
        if (t >= 1) endDeath(hooks);
    }
    else if (player.deathMode === 'fall') {
        // Niente più spinta: solo gravità, il corpo si inclina e perde piume
        player.vy = Math.min(player.vy + config.baseGravity * ts * dt, config.maxFallSpeed * ts);
        player.vx *= 1 - 0.02 * dm;
        const nx = player.x + player.vx;
        if (getTile(nx + (player.vx > 0 ? player.w : 0), player.y + player.h * 0.5)) player.vx = 0;
        else player.x = nx;
        player.y += player.vy;
        const target = (player.facing || 1) * 1.15;
        player.deathRot += (target - player.deathRot) * 0.035 * dm;
        if (Math.random() < 0.3 * dm) createFeather(cx + (Math.random() - 0.5) * player.w * 0.7, player.y + player.h * 0.4, true);
        const inLava = lavas.some(l => rectIntersect(player, l, false));
        if (inLava && Math.random() < 0.5 * dm) steamPuff(cx + (Math.random() - 0.5) * player.w, player.y + player.h * 0.7, true);
        const hit = [4, player.w / 2, player.w - 4].some(p => getTile(player.x + p, player.y + player.h));
        if (hit) {
            player.y = Math.floor((player.y + player.h) / ts) * ts - player.h;
            player.vy = 0;
            startCrumble(inLava);
        } else if (player.deathTime > FALL_MAX_TIME) {
            startCrumble(inLava);
        }
    }
    else if (player.deathMode === 'crumble') {
        if (player.deathTime >= CRUMBLE_TIME) endDeath(hooks);
    }
}

// Impatto: il corpo si spezza in frammenti dello sprite che rimbalzano e si posano, con una nuvola di polvere
function startCrumble(inLava) {
    player.deathMode = 'crumble';
    player.deathTime = 0;
    const ts = config.tileSize;
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    const pw = player.w / PIECES_X, ph = player.h / PIECES_Y;
    const cos = Math.cos(player.deathRot), sin = Math.sin(player.deathRot);
    for (let j = 0; j < PIECES_Y; j++) {
        for (let i = 0; i < PIECES_X; i++) {
            const lx = (i + 0.5) * pw - player.w / 2, ly = (j + 0.5) * ph - player.h / 2;
            const x = cx + lx * cos - ly * sin, y = cy + lx * sin + ly * cos;
            deathFx({ kind: 'piece', i, j, x, y, w: pw, h: ph, flip: player.facing === -1,
                      vx: (x - cx) * 0.06 + (Math.random() - 0.5) * 0.9, vy: -(0.6 + Math.random() * 1.4) * (1 - j / PIECES_Y * 0.5),
                      rot: player.deathRot, spin: (Math.random() - 0.5) * 0.25, rest: false, life: 1 });
        }
    }
    for (let k = 0; k < 16; k++) {
        deathFx({ kind: 'dust', x: cx + (Math.random() - 0.5) * player.w, y: player.y + player.h - ts * 0.2,
                  vx: (Math.random() - 0.5) * 1.4, vy: -Math.random() * 0.35, size: ts * (0.3 + Math.random() * 0.35), life: 1, decay: 0.012 + Math.random() * 0.01 });
    }
    if (inLava) for (let k = 0; k < 10; k++) steamPuff(cx + (Math.random() - 0.5) * player.w, player.y + player.h * 0.8, true);
    createColorParticles(cx, player.y + player.h * 0.6, 12, 'hit');
    addCameraShake(9);
    playSound('die');
}

function endDeath(hooks) {
    if (gameState.gameOver) return;
    gameState.gameOver = true;
    hooks.onGameOver();
}

// Le particelle della morte continuano a muoversi anche sotto la schermata di game over
function updateDeathParticles(dm) {
    const ts = config.tileSize;
    let write = 0;
    for (const p of deathParticles) {
        if (p.kind === 'drop') {
            p.vy += 0.05 * dm;
            p.y += p.vy * dm;
            if (p.y >= p.floorY) {
                p.life = 0;
                if (Math.random() < 0.5) deathFx({ kind: 'ember', x: p.x, y: p.floorY, vx: (Math.random() - 0.5) * 0.6, vy: -0.4, size: p.size * 0.6, life: 0.5, decay: 0.05, wax: true });
            }
        } else if (p.kind === 'steam' || p.kind === 'dust') {
            p.x += p.vx * dm;
            p.y += p.vy * dm;
            p.vx *= 1 - 0.03 * dm;
            if (p.kind === 'dust') p.vy += 0.004 * dm;
            p.size += ts * (p.kind === 'steam' ? 0.006 : 0.012) * dm;
            p.life -= p.decay * dm;
        } else if (p.kind === 'ember') {
            p.x += p.vx * dm;
            p.y += p.vy * dm;
            if (p.wax) p.vy += 0.05 * dm;
            p.life -= p.decay * dm;
        } else if (p.kind === 'piece' && !p.rest) {
            p.vy = Math.min(p.vy + 0.1 * dm, ts * 0.8);
            if (getTile(p.x + p.vx * dm, p.y)) p.vx *= -0.4;
            p.x += p.vx * dm;
            p.y += p.vy * dm;
            p.rot += p.spin * dm;
            const bottom = p.y + p.h * 0.35;
            if (p.vy > 0 && getTile(p.x, bottom)) {
                p.y = Math.floor(bottom / ts) * ts - p.h * 0.35;
                p.vy *= -0.3;
                p.vx *= 0.55;
                p.spin *= 0.5;
                if (Math.abs(p.vy) < 0.35) { p.vy = 0; p.vx = 0; p.spin = 0; p.rest = true; }
            }
            // nella lava i frammenti sfrigolano e si consumano
            if (lavas.some(l => p.x > l.x && p.x < l.x + l.w && p.y > l.y && p.y < l.y + l.h)) {
                p.life -= 0.02 * dm;
                if (Math.random() < 0.08 * dm) steamPuff(p.x, p.y);
            }
            if (p.y > currentMap.length * ts) p.life = 0;
        }
        if (p.life > 0) deathParticles[write++] = p;
    }
    deathParticles.length = write;
}

export function restorePower(amount) {
    gameState.power = Math.min(gameState.maxPower, gameState.power + amount);
}

function damage(amount) {
    if (gameState.god) return;
    gameState.power -= amount;
    if (gameState.power <= 0) {
        gameState.power = 0;
        playerDie();
    }
}

// ===== SCRITTE VOLANTI ("CHECKPOINT", "+0.5"...) =====
export function addFloatText(x, y, text, color) {
    fx.floatTexts.push({ x, y, text, color, life: 1 });
}

function updateFloatTexts(dm) {
    let write = 0;
    for (const t of fx.floatTexts) {
        t.y -= 0.35 * dm;
        t.life -= 0.012 * dm;
        if (t.life > 0) fx.floatTexts[write++] = t;
    }
    fx.floatTexts.length = write;
}

// ===== PARTICELLE LAVA (braci e bolle) =====
// Nascono solo dalle vasche visibili e restano sopra la loro verticale.
// Sono quadratini colorati senza gradienti: costano pochissimo anche su telefono.
function lavaInView(lava) {
    const z = config.zoom, m = config.tileSize * z * 4;
    const sx = lava.x * z - camera.x, sy = lava.y * z - camera.y;
    return sx + lava.w * z > -m && sx < config.viewportWidth + m && sy + lava.h * z > -m && sy < config.viewportHeight + m;
}

function createLavaParticles(lava, dm) {
    const max = isMobile ? 90 : 180;
    if (lavaParticles.length >= max || !lavaInView(lava)) return;
    const ts = config.tileSize;
    // più la vasca è larga, più braci produce
    const rate = (lava.w / ts) * (isMobile ? 0.012 : 0.02) * dm;
    if (Math.random() > rate) return;
    const bubble = Math.random() < 0.25;
    lavaParticles.push({
        x: lava.x + ts * 0.3 + Math.random() * (lava.w - ts * 0.6),
        y: lava.y + ts * (bubble ? 0.25 : 0.1),
        minX: lava.x + ts * 0.15,
        maxX: lava.x + lava.w - ts * 0.15,
        vy: bubble ? 0 : -(0.12 + Math.random() * 0.25) * ts * 0.12,
        sway: Math.random() * Math.PI * 2,
        life: 1,
        decay: bubble ? 0.045 : 0.008 + Math.random() * 0.01,
        size: bubble ? ts * (0.2 + Math.random() * 0.2) : ts * (0.08 + Math.random() * 0.1),
        type: bubble ? 'bubble' : 'ember'
    });
}

function updateLavaParticles(dm) {
    let write = 0;
    for (let i = 0; i < lavaParticles.length; i++) {
        const p = lavaParticles[i];
        p.life -= p.decay * dm;
        if (p.type === 'ember') {
            p.sway += 0.07 * dm;
            p.y += p.vy * dm;
            p.x += Math.sin(p.sway) * 0.12 * dm;
            if (p.x < p.minX) p.x = p.minX;
            if (p.x > p.maxX) p.x = p.maxX;
        } else {
            p.size *= 1 + 0.02 * dm;   // la bolla si gonfia e scoppia
        }
        if (p.life > 0) lavaParticles[write++] = p;
    }
    lavaParticles.length = write;
}

// ===== POLVERE SOTTO I PIEDI =====
function createDustParticles() {
    if (player.animState === 1 && Math.random() < 0.3) {
        dustParticles.push({
            x: player.x + player.w / 2 + (Math.random() - 0.5) * player.w * 0.5,
            y: player.y + player.h - 2,
            vx: (Math.random() - 0.5) * 0.8 - player.facing * 0.3,
            vy: -Math.random() * 0.4 - 0.1,
            life: 1.0,
            size: Math.random() * 3.5 + 2.5
        });
    }
}

function updateDustParticles(dm) {
    const friction = 1 - (1 - 0.95) * dm;
    let write = 0;
    for (let i = 0; i < dustParticles.length; i++) {
        const p = dustParticles[i];
        p.x += p.vx * dm;
        p.y += p.vy * dm;
        p.vy += 0.02 * dm;
        p.life -= 0.025 * dm;
        p.size += 0.05 * dm;
        p.vx *= friction;
        if (p.life > 0) dustParticles[write++] = p;
    }
    dustParticles.length = write;
}

// ===== PIUME (volo e botta al soffitto) =====
function createFeather(x, y, burst = false) {
    if (featherParticles.length > 60) return;
    featherParticles.push({
        x, y,
        vx: burst ? (Math.random() - 0.5) * 2.4 : -player.facing * (0.3 + Math.random() * 0.5),
        vy: burst ? -Math.random() * 1.6 : 0.2 + Math.random() * 0.3,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.15,
        sway: Math.random() * Math.PI * 2,
        life: 1.0,
        tone: Math.random(),   // sfumatura fra ombra e luce delle ali
        size: config.tileSize * (0.35 + Math.random() * 0.25)
    });
}

function updateFeathers(dm) {
    let write = 0;
    for (let i = 0; i < featherParticles.length; i++) {
        const p = featherParticles[i];
        p.sway += 0.08 * dm;
        p.x += (p.vx + Math.sin(p.sway) * 0.35) * dm;
        p.y += p.vy * dm;
        p.vx *= 1 - 0.03 * dm;
        p.vy = Math.min(p.vy + 0.03 * dm, 0.6);   // cadono piano, come piume
        p.rot += p.spin * dm;
        p.life -= 0.012 * dm;
        if (p.life > 0) featherParticles[write++] = p;
    }
    featherParticles.length = write;
}

// Testa contro il soffitto: perde il volo finché non tocca terra
function onCeilingBump() {
    player.bumped = true;
    player.squash = 0.18;
    addCameraShake(4);
    const cx = player.x + player.w / 2;
    for (let i = 0; i < 7; i++) createFeather(cx + (Math.random() - 0.5) * player.w * 0.8, player.y + player.h * 0.3, true);
}

// ===== PARTICELLE COLORATE =====
const MAX_COLOR_PARTICLES = isMobile ? 70 : 120;
const MAX_FIREWORKS = isMobile ? 18 : 30;
export function createColorParticles(x, y, count, type = 'collect') {
    const colors = type === 'death' || type === 'hit'
        ? ['#ff0000', '#ff6600', '#ffff00'] // Rosso/arancio/giallo per danno
        : ['#00ffff', '#ff00ff', '#ffff00', '#00ff00']; // Cyan/magenta/giallo/verde per collect

    // Tetto ai coriandoli: sui processori lenti centinaia di quadratini pesano
    count = Math.min(count, MAX_COLOR_PARTICLES - colorParticles.length);
    for (let i = 0; i < count; i++) {
        colorParticles.push({
            x, y,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 1.5 + 0.5
        });
    }
}

function updateColorParticles(dm) {
    let write = 0;
    for (let i = 0; i < colorParticles.length; i++) {
        const p = colorParticles[i];
        p.x += p.vx * dm;
        p.y += p.vy * dm;
        p.vy += 0.9 * dm;
        p.life -= 0.02 * dm;
        if (p.life > 0) colorParticles[write++] = p;
    }
    colorParticles.length = write;
}

// ===== FUOCHI D'ARTIFICIO (CUORI E STELLE) =====
function createVictoryBurst(x, y) {
    for (let i = 0; i < 4 && fireworkParticles.length < MAX_FIREWORKS; i++) {
        fireworkParticles.push({
            x: x + (Math.random() - 0.5) * 40,
            y: y + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10 - 5,
            life: 1.0,
            size: Math.random() * 10 + 10,
            type: Math.random() > 0.5 ? 'heart' : 'star'
        });
    }
}

function updateFireworkParticles(dm) {
    let write = 0;
    for (let i = 0; i < fireworkParticles.length; i++) {
        const p = fireworkParticles[i];
        p.x += p.vx * dm;
        p.y += p.vy * dm;
        p.vy += 0.15 * dm;
        p.life -= 0.01 * dm;
        if (p.life > 0) fireworkParticles[write++] = p;
    }
    fireworkParticles.length = write;
}

// ===== CAMERA SHAKE =====
export function addCameraShake(intensity) {
    cameraShake.intensity = Math.max(cameraShake.intensity, intensity);
}

function updateCameraShake() {
    if (cameraShake.intensity > 0) {
        cameraShake.x = (Math.random() - 0.5) * cameraShake.intensity;
        cameraShake.y = (Math.random() - 0.5) * cameraShake.intensity;
        cameraShake.intensity *= 0.9;
        if (cameraShake.intensity < 0.1) cameraShake.intensity = 0;
    } else {
        cameraShake.x = 0;
        cameraShake.y = 0;
    }
}

function winLevel(d, hooks) {
    gameState.won = true;
    gameState.victoryTime = 0;
    gameState.vX = d.x;
    gameState.vY = d.y;
    gameState.vW = d.w;
    gameState.vH = d.h;

    if (sfx.walk) sfx.walk.pause();
    if (sfx.fly) sfx.fly.pause();
    if (sfx.lava) sfx.lava.pause();
    if (sfx.timer) { try { sfx.timer.pause(); sfx.timer.currentTime = 0; } catch(e) {} }

    if (sfx.levelup) {
        try { sfx.levelup.pause(); sfx.levelup.currentTime = 0; } catch(e) {}
    }
    setTimeout(() => safePlayAudio(sfx.levelup), 50);

    hooks.onWin();
}

// hooks = { onWin(), onGameOver() } forniti da main.js
export function update(dt, hooks) {
    const dm = dt * 60;   // moltiplicatore: 1 a 60 aggiornamenti/secondo

    // Effetti che scorrono sempre (anche durante vittoria/morte)
    if (fx.flash > 0) fx.flash = Math.max(0, fx.flash - dt * 2.5);
    if (fx.lightBoost > 0) fx.lightBoost = Math.max(0, fx.lightBoost - dt * 3);
    if (fx.fadeIn > 0) fx.fadeIn = Math.max(0, fx.fadeIn - dt * 1.4);
    fx.titleTime += dt;
    lavaAnimTime.value += 0.05 * dm;
    lavas.forEach(l => createLavaParticles(l, dm));
    updateLavaParticles(dm);
    updateFloatTexts(dm);

    // === HIT-STOP: dopo un colpo il gioco si congela per un istante ===
    if (fx.hitStop > 0) {
        fx.hitStop -= dt;
        return;
    }

    updateColorParticles(dm);
    updateFeathers(dm);
    updateDeathParticles(dm);

    // === GESTIONE VITTORIA E FUOCHI D'ARTIFICIO ===
    if (gameState.won) {
        if (sfx.walk) sfx.walk.pause();
        if (sfx.fly) sfx.fly.pause();
        gameState.victoryTime += dm;

        const centerX = gameState.vX + gameState.vW / 2;
        const centerY = gameState.vY + gameState.vH / 2;
        if (Math.random() < 0.1 * dm) createVictoryBurst(centerX, centerY);
        if (Math.random() < 0.18 * dm) createColorParticles(centerX, centerY, 6 + Math.floor(Math.random() * 3), 'collect');
        updateFireworkParticles(dm);
        return;
    }

    // === GESTIONE GAME OVER NORMALE ===
    if (gameState.gameOver) {
        if (sfx.walk) sfx.walk.pause();
        if (sfx.fly) sfx.fly.pause();
        return;
    }

    // --- GESTIONE ANIMAZIONE MORTE ---
    if (player.isDying) {
        updateDeath(dt, dm, hooks);
        updateCameraShake();
        updateCamera();
        return;
    }

    gameState.levelTime += dt;

    // === GESTIONE COOLDOWN DANNO ===
    if (player.damageCooldown > 0) player.damageCooldown -= dt;
    if (player.squash > 0) player.squash = Math.max(0, player.squash - dt);

    // === TIMER POWER-UP (Pac-Man): countdown 10 secondi, poi stop audio ===
    if (timerPowerUp.active) {
        timerPowerUp.timeLeft -= dt;
        if (timerPowerUp.timeLeft <= 0) {
            timerPowerUp.timeLeft = 0;
            timerPowerUp.active = false;
            if (sfx.timer && !sfx.timer.paused) {
                try { sfx.timer.pause(); sfx.timer.currentTime = 0; } catch(e) {}
            }
        }
    }

    // === POWER EROSION (ICAROUS CORE MECHANIC) ===
    const POWER_DRAIN_PER_SECOND = 0.007;
    damage(POWER_DRAIN_PER_SECOND * dt);
    if (player.isDying) return;

    // === 1. MOVIMENTO ORIZZONTALE E COLLISIONI LATERALI ===
    const speed = config.baseSpeed * config.tileSize * dt;
    if (keys.right) {
        player.vx = speed;
        player.facing = 1;
    }
    else if (keys.left) {
        player.vx = -speed;
        player.facing = -1;
    }
    else player.vx = 0;

    player.x += player.vx;

    // Sensori laterali distribuiti sull'altezza del player
    const hPoints = [0.1];
    if (config.tileSize > 2) {
        for (let p = config.tileSize - 2; p < player.h - 1; p += config.tileSize - 2) {
            hPoints.push(p);
        }
    }
    hPoints.push(player.h - 0.1);

    for (let p of hPoints) {
        if (player.vx > 0 && getTile(player.x + player.w, player.y + p)) {
            player.x = Math.floor((player.x + player.w) / config.tileSize) * config.tileSize - player.w - 0.01;
            player.vx = 0;
        }
        if (player.vx < 0 && getTile(player.x, player.y + p)) {
            player.x = (Math.floor(player.x / config.tileSize) + 1) * config.tileSize + 0.01;
            player.vx = 0;
        }
    }

    // === 2. MOVIMENTO VERTICALE E COLLISIONI PAVIMENTO/SOFFITTO ===
    const grav = config.baseGravity * config.tileSize * dt;
    const thr = config.baseThrust * config.tileSize * dt;

    const thrusting = keys.up && player.canFly;
    if (thrusting) player.vy += thr;

    player.vy += grav;
    const mF = config.maxFallSpeed * config.tileSize;
    const mY = config.maxFlySpeed * config.tileSize;
    if (player.vy > mF) player.vy = mF;
    if (player.vy < mY) player.vy = mY;

    player.y += player.vy;

    // Sensori pavimento/soffitto distribuiti sulla larghezza del player
    const margin = 4;
    const wPoints = [margin];
    if (config.tileSize > 2) {
        for (let p = margin + config.tileSize - 2; p < player.w - margin; p += config.tileSize - 2) {
            wPoints.push(p);
        }
    }
    wPoints.push(player.w - margin);

    for (let p of wPoints) {
        // COLLISIONE SOFFITTO (Testa): perde il volo fino all'atterraggio (voluto, come l'originale)
        if (player.vy < 0 && getTile(player.x + p, player.y)) {
            player.y = (Math.floor(player.y / config.tileSize) + 1) * config.tileSize;
            player.vy = 0;
            if (player.canFly) onCeilingBump();
            player.canFly = false;
        }
        // COLLISIONE PAVIMENTO (Piedi)
        if (player.vy > 0 && getTile(player.x + p, player.y + player.h)) {
            player.y = Math.floor((player.y + player.h) / config.tileSize) * config.tileSize - player.h;
            player.vy = 0;
            player.canFly = true;
            player.bumped = false;
        }
    }

    // ANIMAZIONE STATI
    if (player.vy < -0.01) player.animState = 2;
    else if (player.vy > 0.02) player.animState = 3;
    else if (Math.abs(player.vx) > 0.01) player.animState = 1;
    else player.animState = 0;

    // Piume che si staccano mentre sbatte le ali
    if (thrusting && Math.random() < 0.06 * dm) {
        createFeather(player.x + player.w * (player.facing === 1 ? 0.25 : 0.75), player.y + player.h * 0.35);
    }

    // SUONI MOVIMENTO
    if (player.animState === 2 || player.animState === 3) {
        if (sfx.fly && sfx.fly.paused) safePlayAudio(sfx.fly);
        if (sfx.walk) sfx.walk.pause();
    }
    else if (player.animState === 1) {
        if (sfx.walk && sfx.walk.paused) safePlayAudio(sfx.walk);
        if (sfx.fly) sfx.fly.pause();
    }
    else {
        if (sfx.walk) sfx.walk.pause();
        if (sfx.fly) sfx.fly.pause();
    }

    player.frameTimer += dm;
    if (player.frameTimer > 8) {
        player.frameTimer = 0;
        player.frameIndex = (player.frameIndex + 1) % 4;
    }

    createDustParticles();
    updateDustParticles(dm);
    updateCameraShake();

    // === NEMICI: MOVIMENTO E DANNO ===
    const ENEMY_HIT_DAMAGE = 0.25;

    enemies.forEach(en => {
        // === PAC-MAN: nemici congelati durante il power-up timer ===
        if (en.type === 'W') {
            if (en.state === 'active') updateWispField(dt);
            if (!timerPowerUp.active) updateWisp(en, dt, dm);
            if (en.state !== 'active') return;   // addormentato o mentre compare: niente collisione
        } else if (!timerPowerUp.active) {
            en.x += en.vx * dm;
            en.y += en.vy * dm;

            if (en.vx > 0 && (getTile(en.x + en.w, en.y) || getTile(en.x + en.w, en.y + en.h - 1))) en.vx *= -1;
            else if (en.vx < 0 && (getTile(en.x, en.y) || getTile(en.x, en.y + en.h - 1))) en.vx *= -1;
            if (en.vy > 0 && (getTile(en.x, en.y + en.h) || getTile(en.x + en.w - 1, en.y + en.h))) en.vy *= -1;
            else if (en.vy < 0 && (getTile(en.x, en.y) || getTile(en.x + en.w - 1, en.y))) en.vy *= -1;
        }

        // COLLISIONE NEMICO
        if (rectIntersect(player, en, true) && player.damageCooldown <= 0 && !gameState.god) {
            safePlayAudio(sfx.contact);
            player.damageCooldown = 2.0;

            createColorParticles(player.x + player.w / 2, player.y + player.h / 2, 20, 'hit');
            addCameraShake(10);
            fx.hitStop = 0.09;   // micro-pausa che dà peso al colpo
            fx.flash = 0.45;     // lampo bianco
            damage(ENEMY_HIT_DAMAGE);
        }
    });

    // === LAVA: DANNO CONTINUO ===
    const LAVA_DAMAGE_PER_SECOND = 0.5;
    let touchingLava = false;

    lavas.forEach(l => {
        if (rectIntersect(player, l, false)) {
            touchingLava = true;
            damage(LAVA_DAMAGE_PER_SECOND * dt);
            if (Math.random() < 0.1) {
                createColorParticles(player.x + player.w / 2, player.y + player.h / 2, 5, 'hit');
            }
        }
    });

    player.isInLava = touchingLava;

    // Suono lava: one-shot al contatto, si risuona solo se esce e rientra
    if (touchingLava) {
        if (sfx.lava && !player._lavaWasPlaying) {
            try { sfx.lava.currentTime = 0; sfx.lava.play().catch(() => {}); } catch(e) {}
            player._lavaWasPlaying = true;
        }
    } else {
        if (sfx.lava && player._lavaWasPlaying) {
            try { sfx.lava.pause(); sfx.lava.currentTime = 0; } catch(e) {}
            player._lavaWasPlaying = false;
        }
    }

    // === OGGETTI ===
    items.forEach(item => {
        if (!item.taken && rectIntersect(player, item, false)) {
            item.taken = true;

            const itemCenterX = item.x + item.w / 2;
            const itemCenterY = item.y + item.h / 2;
            createColorParticles(itemCenterX, itemCenterY, 15, 'collect');

            if (item.type === 'key') {
                gameState.hasKey = true;
                safePlayAudio(sfx.keyPickup);
                addFloatText(itemCenterX, item.y, 'KEY!', '#FFD54A');
            }
            else if (item.type === 'bulb') {
                restorePower(0.5);
                gameState.bulbs++;
                gameState.levelStats.bulbs++;
                fx.lightBoost = 1;   // la luce si allarga per un attimo
                playSound('bonus');
            }
            else if (item.type === 'star') {
                restorePower(0.25);
                gameState.stars++;
                gameState.levelStats.stars++;
                playSound('bonus');
            }
            else if (item.type === 'flag') {
                gameState.flags++;
                gameState.levelStats.flags++;
                gameState.hasFlag = true;
                // CHECKPOINT: si riparte da qui, con l'energia che si aveva
                gameState.checkpoint = { x: player.x, y: player.y, power: gameState.power };
                addFloatText(itemCenterX, item.y, 'CHECKPOINT', '#7CFFB2');
                safePlayAudio(sfx.flagPickup);
            }
            else if (item.type === 'timer') {
                restorePower(0.1);
                // === POWER-UP PAC-MAN: blocca nemici per 10 secondi ===
                timerPowerUp.active = true;
                timerPowerUp.timeLeft = 10;
                if (sfx.timer) {
                    try { sfx.timer.currentTime = 0; } catch(e) {}
                    safePlayAudio(sfx.timer);
                } else {
                    playSound('bonus');
                }
            }
        }
    });

    triggers.forEach(trig => {
        if (trig.type !== 'door' && rectIntersect(player, trig, false)) {
            if (trig.type === 'open') {
                triggers.forEach(door => {
                    if (door.type === 'door' && door.group === trig.group && !door.open) {
                        door.open = true;
                        if (sfx.doorOpen && sfx.doorOpen.paused) safePlayAudio(sfx.doorOpen);
                    }
                });
            }
            if (trig.type === 'close') {
                triggers.forEach(door => {
                    if (door.type === 'door' && door.group === trig.group && door.open) {
                        door.open = false;
                        if (sfx.doorClose && sfx.doorClose.paused) safePlayAudio(sfx.doorClose);
                    }
                });
            }
        }
    });

    decorations.forEach(d => {
        if (d.type === 'woman' && rectIntersect(player, d, false) && gameState.hasKey && !gameState.won) {
            createColorParticles(d.x + d.w / 2, d.y + d.h / 2, 50, 'collect');
            winLevel(d, hooks);
        }
    });

    updateCamera();
}

export function updateCamera(snap = false) {
    let tx = (player.x * config.zoom) - (config.viewportWidth / 2);
    let ty = (player.y * config.zoom) - (config.viewportHeight / 2);
    // Livello più piccolo dello schermo: lo teniamo centrato invece di farlo scorrere
    const mapW = (currentMap[0]?.length || 0) * config.tileSize * config.zoom;
    const mapH = currentMap.length * config.tileSize * config.zoom;
    if (mapW && mapW <= config.viewportWidth) tx = (mapW - config.viewportWidth) / 2;
    if (mapH && mapH <= config.viewportHeight) ty = (mapH - config.viewportHeight) / 2;
    if (snap) { camera.x = tx; camera.y = ty; return; }
    camera.x += (tx - camera.x) * 0.1;
    camera.y += (ty - camera.y) * 0.1;
    camera.x += cameraShake.x;
    camera.y += cameraShake.y;
}
