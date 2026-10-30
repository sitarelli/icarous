/* -------------------------------------------------------------------------- */
/* RENDERING E DISEGNO                                                        */
/* -------------------------------------------------------------------------- */

import { config, settings, player, gameState, camera, currentMap, items, enemies, lavas, triggers, decorations, lavaParticles, dustParticles, fireworkParticles, colorParticles, featherParticles, deathParticles, lavaAnimTime, fx, isMobile, isLab, timerPowerUp } from './config.js';

const FONT_TITLE = 'Anton, "Bebas Neue", Impact, sans-serif';
const FONT_TEXT = 'Poppins, "DM Sans", system-ui, sans-serif';

let ctx = null;
let canvas = null;
let dpr = 1;
let sprites = {};

/* ===================== SFONDO (sfocato e scurito una volta sola) ===================== */

let bgCanvas = null;
let bgSrc = '';
const PARALLAX_FACTOR = 0.3;

// Lo sfondo fotografico viene sfocato e desaturato: così non "litiga" con gli sprite cartoon.
// Per non vedere la linea dove una foto si attacca all'altra, la tessera è fatta di 4 copie
// a specchio (normale, ribaltata in orizzontale, in verticale, in entrambi i sensi): i bordi
// combaciano sempre e, con la sfocatura, l'attacco sparisce.
function buildBackground(img) {
    const tileW = 800;   // la foto è ridotta a 1/5 e sfocata: più risoluzione non servirebbe
    const tileH = Math.round(tileW * img.naturalHeight / img.naturalWidth);
    const small = document.createElement('canvas');
    small.width = Math.round(tileW / 4);
    small.height = Math.round(tileH / 4);
    const sctx = small.getContext('2d');
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(img, 0, 0, small.width, small.height);

    // tessera piccola a specchio, poi ingrandita tutta insieme (la sfocatura passa sopra gli attacchi)
    const mirror = document.createElement('canvas');
    mirror.width = small.width * 2;
    mirror.height = small.height * 2;
    const mctx = mirror.getContext('2d');
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([fx, fy]) => {
        mctx.setTransform(fx, 0, 0, fy, fx < 0 ? mirror.width : 0, fy < 0 ? mirror.height : 0);
        mctx.drawImage(small, 0, 0);
    });

    const out = document.createElement('canvas');
    out.width = tileW * 2;
    out.height = tileH * 2;
    const octx = out.getContext('2d');
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(mirror, 0, 0, out.width, out.height);
    octx.globalCompositeOperation = 'saturation';
    octx.globalAlpha = 0.45;
    octx.fillStyle = 'hsl(0, 0%, 50%)';
    octx.fillRect(0, 0, out.width, out.height);
    // scurimento già "cotto" nella tessera: un riempimento a tutto schermo in meno a ogni frame
    octx.globalCompositeOperation = 'source-over';
    octx.globalAlpha = 0.45;
    octx.fillStyle = '#000';
    octx.fillRect(0, 0, out.width, out.height);
    return out;
}

export function setBackgroundForLevel(levelNumber) {
    const src = `jpg/sfondo${levelNumber}.jpg`;
    if (bgSrc === src) return;
    bgSrc = src;
    const img = new Image();
    img.onload = () => { if (bgSrc === src) bgCanvas = buildBackground(img); };
    img.onerror = () => {
        // Sfondo mancante: ne riusa uno esistente (1..10) a rotazione
        const fallback = `jpg/sfondo${((levelNumber - 1) % 10 + 10) % 10 + 1}.jpg`;
        if (fallback === src) return;
        const fb = new Image();
        fb.onload = () => { if (bgSrc === src) bgCanvas = buildBackground(fb); };
        fb.src = fallback;
    };
    img.src = src;
}

function drawBackground() {
    const vW = config.viewportWidth;
    const vH = config.viewportHeight;
    if (!bgCanvas) {
        ctx.fillStyle = '#1a1410';
        ctx.fillRect(0, 0, vW, vH);
        return;
    }
    // una foto alta quanto lo schermo; la tessera ne contiene 2×2 (a specchio)
    const scale = 2 * vH / bgCanvas.height;
    const scaledW = bgCanvas.width * scale;
    const scaledH = 2 * vH;
    const offX = ((camera.x * PARALLAX_FACTOR) % scaledW + scaledW) % scaledW;
    const offY = ((camera.y * PARALLAX_FACTOR) % scaledH + scaledH) % scaledH;
    for (let tx = -offX; tx < vW; tx += scaledW) {
        ctx.drawImage(bgCanvas, tx, -offY, scaledW, scaledH);
        if (scaledH - offY < vH) ctx.drawImage(bgCanvas, tx, -offY + scaledH, scaledW, scaledH);
    }
}

/* ===================== INIZIALIZZAZIONE E CACHE DEL LIVELLO ===================== */

let lightCanvas = null, lctx = null;
const LIGHT_RES = 0.5;    // la luce è tutta sfumata: basta mezza risoluzione (4 volte meno pixel)
let lightSprite = null;   // cerchio sfumato disegnato una volta sola e poi solo copiato
const glowSprites = {};   // aloni colorati per stelle e interruttori (al posto di shadowBlur)
const emojiSprites = {};  // cuori e stelle della vittoria (le emoji come testo costano moltissimo)
let tintCanvas = null, tctx = null;
let wallEdges = null;     // per ogni tile muro: quali lati sono esposti
let minimap = null;       // mappa in miniatura per il radar
const MINI_PX = 3;        // pixel per tile nella minimappa
const EDGE_UP = 1, EDGE_DOWN = 2, EDGE_LEFT = 4, EDGE_RIGHT = 8, SHADOW = 16;

export function initRenderer(canvasElement, contextElement, spritesData) {
    canvas = canvasElement;
    ctx = contextElement;
    sprites = spritesData;

    lightCanvas = document.createElement('canvas');
    lctx = lightCanvas.getContext('2d');

    tintCanvas = document.createElement('canvas');
    tintCanvas.width = tintCanvas.height = 512;
    tctx = tintCanvas.getContext('2d');

    lightSprite = document.createElement('canvas');
    lightSprite.width = lightSprite.height = 128;
    const l = lightSprite.getContext('2d');
    const g = l.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.35, 'rgba(0,0,0,0.9)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    l.fillStyle = g;
    l.fillRect(0, 0, 128, 128);
}

function glowSprite(color) {
    if (glowSprites[color]) return glowSprites[color];
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g2 = c.getContext('2d');
    const g = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    g2.globalAlpha = 0.7;
    g2.fillStyle = g;
    g2.fillRect(0, 0, 64, 64);
    return (glowSprites[color] = c);
}

function emojiSprite(ch) {
    if (emojiSprites[ch]) return emojiSprites[ch];
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const e = c.getContext('2d');
    e.font = '52px sans-serif';
    e.textAlign = 'center';
    e.textBaseline = 'middle';
    e.fillText(ch, 32, 35);
    return (emojiSprites[ch] = c);
}

// Chiamata da main.js quando la finestra cambia misura: la luce dinamica segue la tela
export function resizeRenderer(pixelRatio) {
    dpr = pixelRatio || 1;
    if (!lightCanvas) return;
    lightCanvas.width = Math.max(1, Math.round(config.viewportWidth * LIGHT_RES));
    lightCanvas.height = Math.max(1, Math.round(config.viewportHeight * LIGHT_RES));
}

const isWall = (x, y) => y < 0 || y >= currentMap.length || x < 0 || x >= currentMap[0].length || currentMap[y][x] === 1;

// Da chiamare dopo il parsing del livello: prepara bordi dei muri e minimappa
export function prepareLevel() {
    const rows = currentMap.length;
    const cols = currentMap[0]?.length || 0;
    wallEdges = new Uint8Array(rows * cols);
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let e = 0;
            if (currentMap[y][x] === 1) {
                if (!isWall(x, y - 1)) e |= EDGE_UP;
                if (!isWall(x, y + 1)) e |= EDGE_DOWN;
                if (!isWall(x - 1, y)) e |= EDGE_LEFT;
                if (!isWall(x + 1, y)) e |= EDGE_RIGHT;
            } else if (y > 0 && currentMap[y - 1][x] === 1) {
                e |= SHADOW;
            }
            wallEdges[y * cols + x] = e;
        }
    }

    minimap = document.createElement('canvas');
    minimap.width = Math.max(1, cols * MINI_PX);
    minimap.height = Math.max(1, rows * MINI_PX);
    const m = minimap.getContext('2d');
    m.fillStyle = 'rgba(214, 220, 232, 0.9)';
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (currentMap[y][x] === 1) m.fillRect(x * MINI_PX, y * MINI_PX, MINI_PX, MINI_PX);
        }
    }
    const ts = config.tileSize;
    m.fillStyle = '#ff6a1a';
    lavas.forEach(l => m.fillRect(l.x / ts * MINI_PX, l.y / ts * MINI_PX, l.w / ts * MINI_PX, l.h / ts * MINI_PX));
}

/* ===================== UTILITÀ DI DISEGNO ===================== */

const toScreenX = x => x * config.zoom - camera.x;
const toScreenY = y => y * config.zoom - camera.y;

function drawImg(img, x, y, wS, hS, flip = false) {
    const sx = toScreenX(x);
    const sy = toScreenY(y);
    const sw = config.tileSize * config.zoom * wS;
    const sh = config.tileSize * config.zoom * hS;
    if (img && img.complete) {
        if (flip) {
            ctx.save();
            ctx.translate(sx + sw, sy);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, sw, sh);
            ctx.restore();
        } else {
            ctx.drawImage(img, sx, sy, sw, sh);
        }
    }
}

// Disegna uno sprite colorato (solo le sue forme, non il rettangolo intorno)
function drawTinted(img, srcRect, dx, dy, dw, dh, color, alpha, flip = false) {
    const w = Math.ceil(dw * dpr), h = Math.ceil(dh * dpr);
    if (w <= 0 || h <= 0) return;
    if (w > tintCanvas.width || h > tintCanvas.height) {
        tintCanvas.width = Math.max(tintCanvas.width, w);
        tintCanvas.height = Math.max(tintCanvas.height, h);
    }
    tctx.globalCompositeOperation = 'source-over';
    tctx.clearRect(0, 0, w, h);
    if (srcRect) tctx.drawImage(img, srcRect[0], srcRect[1], srcRect[2], srcRect[3], 0, 0, w, h);
    else tctx.drawImage(img, 0, 0, w, h);
    tctx.globalCompositeOperation = 'source-atop';
    tctx.globalAlpha = alpha;
    tctx.fillStyle = color;
    tctx.fillRect(0, 0, w, h);
    tctx.globalAlpha = 1;
    ctx.save();
    if (flip) {
        ctx.translate(dx + dw, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(tintCanvas, 0, 0, w, h, 0, 0, dw, dh);
    } else {
        ctx.drawImage(tintCanvas, 0, 0, w, h, dx, dy, dw, dh);
    }
    ctx.restore();
}

function starPath(c, x, y, r) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const rr = i % 2 === 0 ? r : r * 0.45;
        c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
}

/* ===================== MURI CON BORDI E OMBRE ===================== */

function drawWalls() {
    const tz = config.tileSize * config.zoom;
    const cols = currentMap[0]?.length || 0;
    const startX = Math.max(0, Math.floor(camera.x / tz));
    const endX = Math.min(cols, Math.ceil((camera.x + config.viewportWidth) / tz) + 1);
    const startY = Math.max(0, Math.floor(camera.y / tz));
    const endY = Math.min(currentMap.length, Math.ceil((camera.y + config.viewportHeight) / tz) + 1);

    // 1) ombre proiettate sotto mensole e soffitti
    const shadowH = tz * 1.1;
    const grad = ctx.createLinearGradient(0, 0, 0, shadowH);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            if (wallEdges[y * cols + x] & SHADOW) {
                const sx = x * tz - camera.x, sy = y * tz - camera.y;
                ctx.translate(sx, sy);
                ctx.fillRect(0, 0, tz + 0.5, shadowH);
                ctx.translate(-sx, -sy);
            }
        }
    }

    // 2) mattoni
    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            if (currentMap[y][x] === 1) drawImg(sprites.brick, x * config.tileSize, y * config.tileSize, 1, 1);
        }
    }

    // 3) bordi: ombra sotto e ai lati (disegnati in blocco, costano poco).
    //    Niente striscia chiara sopra: Icarous deve poggiare sui mattoni, non su una linea disegnata.
    const dk = Math.max(1, tz * 0.16), sd = Math.max(1, tz * 0.1);
    const bottom = new Path2D(), sides = new Path2D();
    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const e = wallEdges[y * cols + x];
            if (!e || (e & SHADOW)) continue;
            const sx = x * tz - camera.x, sy = y * tz - camera.y;
            if (e & EDGE_DOWN) bottom.rect(sx, sy + tz - dk, tz, dk);
            if (e & EDGE_LEFT) sides.rect(sx, sy, sd, tz);
            if (e & EDGE_RIGHT) sides.rect(sx + tz - sd, sy, sd, tz);
        }
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
    ctx.fill(bottom);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.20)';
    ctx.fill(sides);
}

/* ===================== LAVA ===================== */

function drawLava(l) {
    const sx = toScreenX(l.x);
    const sy = toScreenY(l.y);
    const sw = l.w * config.zoom;
    const tz = config.tileSize * config.zoom;
    if (sx + sw < -tz * 4 || sx > config.viewportWidth + tz * 4 || sy > config.viewportHeight + tz * 4 || sy + l.h * config.zoom < -tz * 4) return;
    drawImg(sprites.lava, l.x, l.y, l.w / config.tileSize, l.h / config.tileSize);
    ctx.save();
    // cresta luminosa che ondeggia
    ctx.globalAlpha = 0.45;
    const waveOffset = Math.sin(lavaAnimTime.value + l.x * 0.01) * 3;
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(sx, sy + waveOffset, sw, Math.max(2, tz * 0.15));
    // bagliore caldo: un'ellisse sfumata in tutte le direzioni (niente bordi netti),
    // centrata sulla superficie della lava e larga quanto la vasca
    const flicker = 0.85 + Math.sin(lavaAnimTime.value * 1.7 + l.x) * 0.15;
    const rx = sw / 2 + tz * 0.6;
    const ry = tz * 3.2;
    const cx = sx + sw / 2;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(cx, sy);
    ctx.scale(rx / ry, 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
    g.addColorStop(0, `rgba(255, 110, 20, ${0.26 * flicker})`);
    g.addColorStop(0.45, `rgba(255, 80, 10, ${0.11 * flicker})`);
    g.addColorStop(1, 'rgba(255, 60, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-ry, -ry, ry * 2, ry);   // solo la metà sopra la superficie
    ctx.restore();
}

function drawLavaParticles() {
    if (!lavaParticles.length) return;
    const z = config.zoom;
    const t = Date.now() * 0.02;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of lavaParticles) {
        const px = toScreenX(p.x), py = toScreenY(p.y);
        if (p.type === 'ember') {
            // giallo appena nata → arancio → rosso scuro mentre si spegne, con un leggero tremolio
            const flick = 0.75 + 0.25 * Math.sin(t + p.sway * 3);
            ctx.globalAlpha = Math.min(1, p.life * 1.4) * flick;
            ctx.fillStyle = p.life > 0.66 ? '#ffe27a' : p.life > 0.33 ? '#ff8a1e' : '#d8340c';
            const s = Math.max(1, p.size * z);
            ctx.fillRect(px - s / 2, py - s / 2, s, s);
        } else {
            ctx.globalAlpha = p.life * 0.8;
            ctx.strokeStyle = '#ffc04d';
            ctx.lineWidth = Math.max(1, z * 0.6);
            ctx.beginPath();
            ctx.arc(px, py, p.size * z, Math.PI, 0);   // mezza bolla che affiora
            ctx.stroke();
        }
    }
    ctx.restore();
}

/* ===================== PARTICELLE ===================== */

function drawDustParticles() {
    if (!dustParticles.length) return;
    ctx.save();
    ctx.fillStyle = 'rgb(130, 130, 130)';
    dustParticles.forEach(p => {
        const particleSize = isFinite(p.size) && p.size > 0 ? p.size : 2;
        ctx.globalAlpha = p.life * 0.3;
        ctx.beginPath();
        ctx.arc(toScreenX(p.x), toScreenY(p.y), particleSize * 0.7, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

function drawFeathers() {
    featherParticles.forEach(p => {
        const px = toScreenX(p.x);
        const py = toScreenY(p.y);
        const s = p.size * config.zoom;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, p.life * 1.5);
        // Stesso beige-tortora delle ali dello sprite (png/icarous.png): da #a4967e (ombra) a #d8c8a8 (luce)
        const t = p.tone ?? 0.5;
        ctx.fillStyle = `rgb(${164 + 52 * t | 0}, ${150 + 50 * t | 0}, ${126 + 42 * t | 0})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, s, s * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(96, 76, 56, 0.85)';   // rachide marrone come i contorni delle ali
        ctx.lineWidth = Math.max(0.6, s * 0.08);
        ctx.beginPath();
        ctx.moveTo(-s * 1.15, 0);
        ctx.lineTo(s * 0.9, 0);
        ctx.stroke();
        ctx.restore();
    });
}

function drawFireworkParticles() {
    if (!fireworkParticles.length) return;
    ctx.save();
    fireworkParticles.forEach(p => {
        if (p.life <= 0) return;
        const s = p.size * 2 * config.zoom;
        ctx.globalAlpha = p.life;
        ctx.drawImage(emojiSprite(p.type === 'heart' ? '❤️' : '⭐'), toScreenX(p.x) - s / 2, toScreenY(p.y) - s / 2, s, s);
    });
    ctx.restore();
}

function drawColorParticles() {
    if (!colorParticles.length) return;
    ctx.save();
    colorParticles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(toScreenX(p.x), toScreenY(p.y), p.size * config.zoom, p.size * config.zoom);
    });
    ctx.restore();
}

function drawFloatTexts() {
    const tz = config.tileSize * config.zoom;
    fx.floatTexts.forEach(t => {
        ctx.save();
        ctx.globalAlpha = Math.min(1, t.life * 2);
        ctx.font = `${Math.round(tz * 1.3)}px ${FONT_TITLE}`;
        ctx.textAlign = 'center';
        ctx.lineWidth = Math.max(2, tz * 0.18);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.strokeText(t.text, toScreenX(t.x), toScreenY(t.y));
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, toScreenX(t.x), toScreenY(t.y));
        ctx.restore();
    });
}

/* ===================== PLAYER ===================== */

function drawPlayer() {
    if (player.isDying) { drawDyingPlayer(); return; }
    const img = sprites.icarous;
    if (!img || !img.complete) return;
    if (player.damageCooldown > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;
    const cellW = img.naturalWidth / 4;
    const cellH = img.naturalHeight / 4;
    const trimX = 120;
    const trimY = 18;
    const src = [(player.frameIndex * cellW) + trimX, (player.animState * cellH) + trimY, cellW - trimX * 2, cellH - trimY * 2];
    const dx = toScreenX(player.x);
    const dy = toScreenY(player.y);
    const dw = player.w * config.zoom;
    const dh = player.h * config.zoom;

    // Botta in testa: schiacciamento verso il basso che rientra in un attimo
    const k = player.squash > 0 ? player.squash / 0.18 : 0;
    const scaleX = 1 + 0.18 * k, scaleY = 1 - 0.22 * k;
    const fw = dw * scaleX, fh = dh * scaleY;
    const fx0 = dx + (dw - fw) / 2, fy0 = dy + (dh - fh);
    const flip = player.facing === -1;

    if (player.isInLava && !player.isDying) {
        const intensity = 0.45 + Math.sin(Date.now() * 0.012) * 0.2;
        drawTinted(img, src, fx0, fy0, fw, fh, '#ff3a00', intensity, flip);
    } else if (player.bumped && !player.isDying) {
        drawTinted(img, src, fx0, fy0, fw, fh, '#8a96b8', 0.28, flip);   // ali "spente"
    } else {
        ctx.save();
        if (flip) {
            ctx.translate(fx0 + fw, fy0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, src[0], src[1], src[2], src[3], 0, 0, fw, fh);
        } else {
            ctx.drawImage(img, src[0], src[1], src[2], src[3], fx0, fy0, fw, fh);
        }
        ctx.restore();
    }

    if (player.bumped && !player.isDying) drawDizzy(dx, dy, dw, dh);
}

/* ===================== MORTE ===================== */

// Riquadro di un fotogramma di png/icarous_die.png (4 colonne × 2 righe)
function dieFrame(img, n) {
    const sw = img.naturalWidth / 4, sh = img.naturalHeight / 2;
    return [(n % 4) * sw, Math.floor(n / 4) * sh, sw, sh];
}

function drawDyingPlayer() {
    const img = sprites.icarous_die;
    if (!img || !img.complete || player.deathMode === 'crumble') return;   // sbriciolato: restano solo i frammenti
    const z = config.zoom;
    const dx = toScreenX(player.x), dy = toScreenY(player.y);
    const dw = player.w * z, dh = player.h * z;
    const flip = player.facing === -1;

    if (player.deathMode === 'fall') {
        // Corpo senza vita che precipita inclinandosi, sempre più grigio
        const k = Math.min(1, player.deathTime / 0.6);
        ctx.save();
        ctx.translate(dx + dw / 2, dy + dh / 2);
        ctx.rotate(player.deathRot);
        drawTinted(img, dieFrame(img, 1), -dw / 2, -dh / 2, dw, dh, '#5d6b80', 0.15 + 0.3 * k, flip);
        ctx.restore();
        return;
    }

    // Scioglimento: i fotogrammi del foglio + un affossamento verso il basso, rovente all'inizio
    const t = Math.min(1, player.deathTime / 2.6);
    const wob = Math.sin(player.deathTime * 18) * (1 - t) * 0.03;
    const sx = 1 + 0.12 * t + wob, sy = 1 - 0.1 * t - wob;
    const fw = dw * sx, fh = dh * sy;
    const fx0 = dx + (dw - fw) / 2, fy0 = dy + 3 * z + (dh - fh);
    const heat = Math.max(0, 1 - t / 0.45);
    if (heat > 0) drawTinted(img, dieFrame(img, player.deathFrame), fx0, fy0, fw, fh, '#ff5a10', 0.55 * heat, flip);
    else {
        ctx.save();
        if (flip) { ctx.translate(fx0 + fw, fy0); ctx.scale(-1, 1); ctx.drawImage(img, ...dieFrame(img, player.deathFrame), 0, 0, fw, fh); }
        else ctx.drawImage(img, ...dieFrame(img, player.deathFrame), fx0, fy0, fw, fh);
        ctx.restore();
    }
}

// Pozza di cera che si allarga ai piedi (resta anche sotto il game over)
function drawWaxPuddle() {
    if (!player.isDying || player.puddle <= 0) return;
    const z = config.zoom, ts = config.tileSize;
    const cx = toScreenX(player.x + player.w / 2), cy = toScreenY(player.y + player.h) - 0.5 * z;
    const rx = player.puddle * z, ry = ts * 0.32 * z;
    const t = Math.min(1, player.deathTime / 2.6);
    ctx.save();
    // alone caldo finché la cera è liquida
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35 * (1 - t * 0.7);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx * 1.4);
    glow.addColorStop(0, '#ff9a2e');
    glow.addColorStop(1, 'rgba(255, 120, 20, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 1.4, ry * 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.95;
    const g = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
    g.addColorStop(0, '#f7dc9a');
    g.addColorStop(1, '#b9822f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#fff6d8';   // riflesso lucido
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.25, cy - ry * 0.3, rx * 0.35, ry * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawDeathParticles() {
    if (!deathParticles.length) return;
    const z = config.zoom;
    const img = sprites.icarous_die;
    const frame = img && img.complete ? dieFrame(img, 1) : null;
    for (const p of deathParticles) {
        const px = toScreenX(p.x), py = toScreenY(p.y);
        ctx.save();
        if (p.kind === 'piece' && frame) {
            const cw = frame[2] / 5, ch = frame[3] / 6;
            const col = p.flip ? 4 - p.i : p.i;
            ctx.globalAlpha = Math.min(1, p.life * 2);
            ctx.translate(px, py);
            ctx.rotate(p.rot);
            if (p.flip) ctx.scale(-1, 1);
            const w = p.w * z, h = p.h * z;
            ctx.drawImage(img, frame[0] + col * cw, frame[1] + p.j * ch, cw, ch, -w / 2, -h / 2, w, h);
        } else if (p.kind === 'drop') {
            ctx.fillStyle = '#f5d58a';
            const r = Math.max(1, p.size * z);
            ctx.beginPath();
            ctx.ellipse(px, py, r * 0.75, r * (1 + Math.min(1.2, p.vy * 0.6)), 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.kind === 'steam' || p.kind === 'dust') {
            ctx.globalAlpha = Math.max(0, p.life) * (p.kind === 'steam' ? 0.2 : 0.45);
            ctx.fillStyle = p.kind === 'steam' ? '#e6e9f0' : '#9a8e7e';
            ctx.beginPath();
            ctx.arc(px, py, p.size * z, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.kind === 'ember') {
            ctx.globalCompositeOperation = p.wax ? 'source-over' : 'lighter';
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
            ctx.fillStyle = p.wax ? '#f2cf7f' : (p.life > 0.5 ? '#ffd36a' : '#ff6a1a');
            const s = Math.max(1, p.size * z);
            ctx.fillRect(px - s / 2, py - s / 2, s, s);
        }
        ctx.restore();
    }
}

// Stelline che girano sopra la testa: "ho sbattuto, niente volo finché non atterro"
function drawDizzy(dx, dy, dw, dh) {
    const t = Date.now() * 0.006;
    const cx = dx + dw / 2, cy = dy + dh * 0.02;
    const r = Math.max(2.5, dw * 0.09);
    ctx.save();
    for (let i = 0; i < 3; i++) {
        const a = t + i * (Math.PI * 2 / 3);
        const x = cx + Math.cos(a) * dw * 0.38;
        const y = cy + Math.sin(a) * dh * 0.09;
        ctx.globalAlpha = 0.65 + Math.sin(a) * 0.35;
        ctx.fillStyle = '#FFE066';
        ctx.strokeStyle = 'rgba(80, 50, 0, 0.8)';
        ctx.lineWidth = 1;
        starPath(ctx, x, y, r);
        ctx.fill();
        ctx.stroke();
    }
    ctx.restore();
}

/* ===================== OGGETTI, PORTE, NEMICI ===================== */

// Pulsanti OPEN / CLOSE disegnati a mano: piastra di pietra con scritta incisa + gemma luminosa con un lucchetto
// (aperto per OPEN, chiuso per CLOSE). Piastra e gemma si disegnano UNA volta; a ogni frame si copiano,
// più alone, anello di rune che gira, riflesso che passa e scintille. Un pulsante "già usato" si spegne.
const SWITCH_STYLE = {
    open:  { label: 'OPEN',  glow: '#20e0ff', ring: '#8ff4ff', spark: '#d8fdff', gem: ['#f0ffff', '#46e4ff', '#0b6f9a'] },
    close: { label: 'CLOSE', glow: '#ff6a10', ring: '#ffc07a', spark: '#ffe6c8', gem: ['#fff2dc', '#ff8a2a', '#a8300a'] }
};
const switchSprites = {};

function roundRectPath(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
}

function drawPadlock(g, cx, cy, s, open) {
    g.save();
    g.lineJoin = 'round';
    g.lineCap = 'round';
    // archetto: chiuso dentro il corpo, oppure sollevato e ruotato (aperto)
    g.lineWidth = s * 0.16;
    g.strokeStyle = 'rgba(0, 30, 50, 0.55)';
    const shackle = (dx, dy) => {
        g.beginPath();
        if (open) {
            g.moveTo(cx - s * 0.32 + dx, cy - s * 0.05 + dy);
            g.lineTo(cx - s * 0.32 + dx, cy - s * 0.42 + dy);
            g.arc(cx + dx, cy - s * 0.42 + dy, s * 0.32, Math.PI, Math.PI * 1.9);
        } else {
            g.moveTo(cx - s * 0.32 + dx, cy - s * 0.05 + dy);
            g.lineTo(cx - s * 0.32 + dx, cy - s * 0.3 + dy);
            g.arc(cx + dx, cy - s * 0.3 + dy, s * 0.32, Math.PI, 0);
            g.lineTo(cx + s * 0.32 + dx, cy - s * 0.05 + dy);
        }
        g.stroke();
    };
    shackle(s * 0.03, s * 0.04);
    g.strokeStyle = '#ffffff';
    g.lineWidth = s * 0.12;
    shackle(0, 0);
    // corpo
    roundRectPath(g, cx - s * 0.45 + s * 0.03, cy - s * 0.08 + s * 0.04, s * 0.9, s * 0.7, s * 0.14);
    g.fillStyle = 'rgba(0, 30, 50, 0.45)';
    g.fill();
    roundRectPath(g, cx - s * 0.45, cy - s * 0.08, s * 0.9, s * 0.7, s * 0.14);
    g.fillStyle = '#ffffff';
    g.fill();
    // buco della chiave
    g.fillStyle = 'rgba(40, 50, 70, 0.75)';
    g.beginPath();
    g.arc(cx, cy + s * 0.18, s * 0.09, 0, Math.PI * 2);
    g.fill();
    g.fillRect(cx - s * 0.035, cy + s * 0.18, s * 0.07, s * 0.2);
    g.restore();
}

function buildSwitchSprites(type) {
    const st = SWITCH_STYLE[type], S = 192;
    // --- piastra di pietra con rivetti e scritta incisa ---
    const plate = document.createElement('canvas');
    plate.width = plate.height = S;
    const p = plate.getContext('2d');
    roundRectPath(p, 6, 10, S - 12, S - 14, 30);
    p.fillStyle = 'rgba(0, 0, 0, 0.45)';
    p.fill();
    const pg = p.createLinearGradient(0, 4, 0, S - 6);
    pg.addColorStop(0, '#6a6f80');
    pg.addColorStop(1, '#2a2d38');
    roundRectPath(p, 6, 4, S - 12, S - 14, 30);
    p.fillStyle = pg;
    p.fill();
    p.lineWidth = 4;
    p.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    p.stroke();
    [[26, 24], [S - 26, 24], [26, S - 34], [S - 26, S - 34]].forEach(([x, y]) => {
        p.fillStyle = '#1d1f27';
        p.beginPath(); p.arc(x, y + 1, 6, 0, Math.PI * 2); p.fill();
        p.fillStyle = '#9aa0b4';
        p.beginPath(); p.arc(x, y, 5, 0, Math.PI * 2); p.fill();
    });
    p.font = `${Math.round(S * 0.2)}px ${FONT_TITLE}`;
    p.textAlign = 'center';
    p.textBaseline = 'middle';
    p.fillStyle = 'rgba(0, 0, 0, 0.55)';
    p.fillText(st.label, S / 2, S * 0.81 + 2);
    p.fillStyle = st.ring;
    p.fillText(st.label, S / 2, S * 0.81);
    // --- gemma tonda con lucchetto ---
    const gem = document.createElement('canvas');
    gem.width = gem.height = S;
    const g = gem.getContext('2d');
    const c = S / 2, r = S * 0.44;
    g.fillStyle = 'rgba(0, 0, 0, 0.4)';
    g.beginPath(); g.arc(c, c + 5, r + 4, 0, Math.PI * 2); g.fill();
    const rim = g.createLinearGradient(0, c - r, 0, c + r);
    rim.addColorStop(0, '#d7dbe6');
    rim.addColorStop(1, '#5c6172');
    g.fillStyle = rim;
    g.beginPath(); g.arc(c, c, r + 4, 0, Math.PI * 2); g.fill();
    const body = g.createRadialGradient(c - r * 0.3, c - r * 0.35, r * 0.1, c, c, r);
    body.addColorStop(0, st.gem[0]);
    body.addColorStop(0.45, st.gem[1]);
    body.addColorStop(1, st.gem[2]);
    g.fillStyle = body;
    g.beginPath(); g.arc(c, c, r - 4, 0, Math.PI * 2); g.fill();
    drawPadlock(g, c, c + r * 0.05, r * 0.95, type === 'open');
    g.globalAlpha = 0.55;
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(c - r * 0.3, c - r * 0.52, r * 0.42, r * 0.18, -0.35, 0, Math.PI * 2); g.fill();
    return { plate, gem, fontOk: !document.fonts || document.fonts.check(`20px Anton`) };
}

function switchSprite(type) {
    const sp = switchSprites[type];
    // la scritta usa Anton: se all'inizio il font non era ancora pronto, la piastra si ridisegna una volta dopo
    if (!sp || (!sp.fontOk && document.fonts && document.fonts.check(`20px Anton`))) switchSprites[type] = buildSwitchSprites(type);
    return switchSprites[type];
}

// Un pulsante è "carico" se premerlo cambierebbe qualcosa (OPEN con porte ancora chiuse, CLOSE con porte aperte)
function switchIsLive(t) {
    return triggers.some(d => d.type === 'door' && d.group === t.group && (t.type === 'open' ? !d.open : d.open));
}

function drawSwitch(t) {
    const x = toScreenX(t.x), y = toScreenY(t.y), w = t.w * config.zoom, h = t.h * config.zoom;
    if (x + w * 2 < 0 || y + h * 2 < 0 || x - w > config.viewportWidth || y - h > config.viewportHeight) return;
    const st = SWITCH_STYLE[t.type], sp = switchSprite(t.type);
    const live = switchIsLive(t);
    const time = Date.now() * 0.001 + t.x * 0.011;
    const pulse = 0.75 + Math.sin(time * 3.2) * 0.25;
    const gx = x + w / 2, gy = y + h * 0.4, gr = w * 0.3;
    ctx.save();
    // alone
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = live ? 0.4 + 0.4 * pulse : 0.18;
    const gs = w * (live ? 2.5 + 0.25 * pulse : 1.8);
    ctx.drawImage(glowSprite(st.glow), gx - gs / 2, gy - gs / 2, gs, gs);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // piastra e gemma (la gemma "respira" quando è carica, è spenta quando è già usata)
    ctx.drawImage(sp.plate, x, y, w, h);
    const k = live ? 1 + 0.05 * Math.sin(time * 3.2) : 0.94;
    if (!live) ctx.globalAlpha = 0.45;
    ctx.drawImage(sp.gem, gx - gr * k, gy - gr * k, gr * 2 * k, gr * 2 * k);
    ctx.globalAlpha = 1;
    if (live) {
        // anello di rune che gira attorno alla gemma
        ctx.strokeStyle = st.ring;
        ctx.lineWidth = Math.max(1, w * 0.025);
        ctx.setLineDash([w * 0.05, w * 0.07]);
        ctx.lineDashOffset = -time * w * 0.25;
        ctx.globalAlpha = 0.5 + 0.4 * pulse;
        ctx.beginPath();
        ctx.arc(gx, gy, gr * 1.22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // riflesso che attraversa la gemma ogni tanto
        const sweep = (time * 0.45) % 1;
        if (sweep < 0.35) {
            const sx = gx - gr + (sweep / 0.35) * gr * 2;
            ctx.save();
            ctx.beginPath();
            ctx.arc(gx, gy, gr * 0.92, 0, Math.PI * 2);
            ctx.clip();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#ffffff';
            ctx.translate(sx, gy);
            ctx.rotate(0.5);
            ctx.fillRect(-gr * 0.12, -gr * 1.5, gr * 0.24, gr * 3);
            ctx.restore();
        }
        // tre scintille che salgono e svaniscono
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = st.spark;
        for (let i = 0; i < 3; i++) {
            const ph = (time * 0.6 + i / 3) % 1;
            const s = Math.max(1, w * 0.035) * (1 - ph);
            ctx.globalAlpha = 1 - ph;
            ctx.fillRect(gx + Math.sin(i * 2.1 + time) * gr * 1.1 - s, gy - gr - ph * h * 0.55 - s, s * 2, s * 2);
        }
    }
    ctx.restore();
}

// Stella disegnata a mano (niente png): punte arrotondate, sfumatura gialla, riflesso lucido e una faccina.
// Si disegna UNA volta su una tela da 192 px; a ogni frame si copia soltanto (costa come un'immagine).
let starSprite = null;
function buildStarSprite() {
    const S = 192, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const cx = S / 2, cy = S / 2 + 4, R = S * 0.4;
    starPath(g, cx, cy, R);
    // contorno arancio spesso con giunzioni rotonde: arrotonda le punte
    g.lineJoin = 'round';
    g.lineWidth = S * 0.075;
    g.strokeStyle = '#ef8a0c';
    g.stroke();
    const fill = g.createLinearGradient(0, cy - R, 0, cy + R);
    fill.addColorStop(0, '#fff6b0');
    fill.addColorStop(0.45, '#ffd83a');
    fill.addColorStop(1, '#ffa61a');
    g.fillStyle = fill;
    g.fill();
    // riflesso lucido in alto a sinistra (dentro la stella)
    g.save();
    starPath(g, cx, cy, R);
    g.clip();
    g.globalAlpha = 0.55;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(cx - R * 0.28, cy - R * 0.42, R * 0.32, R * 0.16, -0.5, 0, Math.PI * 2);
    g.fill();
    g.restore();
    // faccina: occhi con luccichio, guance rosa, sorriso
    [-1, 1].forEach(s => {
        const ex = cx + s * R * 0.2, ey = cy + R * 0.02;
        g.fillStyle = '#5a2a00';
        g.beginPath();
        g.ellipse(ex, ey, R * 0.07, R * 0.11, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(ex - R * 0.025, ey - R * 0.045, R * 0.03, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 0.45;
        g.fillStyle = '#ff7a6a';
        g.beginPath();
        g.ellipse(cx + s * R * 0.36, cy + R * 0.17, R * 0.08, R * 0.05, 0, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
    });
    g.strokeStyle = '#5a2a00';
    g.lineWidth = S * 0.018;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(cx, cy + R * 0.14, R * 0.09, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
    return c;
}

function drawStarGlow(item) {
    if (!starSprite) starSprite = buildStarSprite();
    const x = toScreenX(item.x), y = toScreenY(item.y), w = item.w * config.zoom, h = item.h * config.zoom;
    if (x + w * 2 < 0 || y + h * 2 < 0 || x - w > config.viewportWidth || y - h > config.viewportHeight) return;
    // ogni stella ha il suo ritmo, così non si muovono tutte insieme
    const t = Date.now() * 0.001 + item.x * 0.013 + item.y * 0.007;
    const pulse = 0.75 + Math.sin(t * 3) * 0.25;
    const cx = x + w / 2, cy = y + h / 2 + Math.sin(t * 2.2) * h * 0.06;   // galleggia piano
    ctx.save();
    // alone luminescente che respira
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.45 + 0.35 * pulse;
    const g = w * (2.6 + 0.3 * pulse);
    ctx.drawImage(glowSprite('#ffc21a'), cx - g / 2, cy - g / 2, g, g);
    // due scintille a croce che si accendono a turno
    ctx.fillStyle = '#fffbe0';
    for (let i = 0; i < 2; i++) {
        const tw = Math.max(0, Math.sin(t * 2.6 + i * Math.PI));
        if (tw < 0.05) continue;
        const a = i * 2.4 + 0.6;
        const sx = cx + Math.cos(a) * w * 0.75, sy = cy + Math.sin(a) * h * 0.7;
        const len = w * 0.16 * tw, th = Math.max(1, w * 0.03);
        ctx.globalAlpha = tw;
        ctx.fillRect(sx - len, sy - th / 2, len * 2, th);
        ctx.fillRect(sx - th / 2, sy - len, th, len * 2);
    }
    // la stella: leggera oscillazione e "respiro"
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const sc = 1.15 * (1 + 0.04 * Math.sin(t * 3));
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(t * 1.6) * 0.12);
    ctx.drawImage(starSprite, -w * sc / 2, -h * sc / 2, w * sc, h * sc);
    ctx.restore();
}

function drawEnemies() {
    const frozen = timerPowerUp.active;
    // Congelati color ghiaccio; ultimi 3 secondi lampeggiano bianchi come i fantasmi di Pac-Man
    const blinkWhite = frozen && timerPowerUp.timeLeft < 3 && Math.floor(timerPowerUp.timeLeft * 5) % 2 === 0;
    enemies.forEach(en => {
        let sprite = sprites.enemyH;
        let flip = false;
        if (en.type === 'H') { sprite = sprites.enemyH; flip = en.vx < 0; }
        else if (en.type === 'V') sprite = sprites.enemyV;
        else if (en.type === 'S') sprite = sprites.enemyS;
        else if (en.type === 'X') { sprite = sprites.enemyX; flip = en.vx > 0; }
        else if (en.type === 'W') return;   // disegnato sopra il buio da drawWisps()
        if (!sprite || !sprite.complete) return;
        if (frozen) {
            const wob = Math.sin(Date.now() * 0.02 + en.x) * config.zoom * 0.6;
            drawTinted(sprite, null, toScreenX(en.x) + wob, toScreenY(en.y), en.w * config.zoom, en.h * config.zoom,
                blinkWhite ? '#ffffff' : '#bfeaff', blinkWhite ? 0.8 : 0.62, flip);
        } else {
            drawImg(sprite, en.x, en.y, en.w / config.tileSize, en.h / config.tileSize, flip);
        }
    });
}

const WISP_RED = { halo: '#ff4a10', body: '#ff7a2a', core: '#ffd36a', spark: '#ffe27a', eye: '#3a0800', ember: ['#ffd36a', '#ff8a1e'], ring: '#ffb347' };
const WISP_BLUE = { halo: '#1e6bff', body: '#3f8cff', core: '#bfe4ff', spark: '#a8e0ff', eye: '#00143a', ember: ['#bfe4ff', '#3f8cff'], ring: '#6fb4ff' };

// Fuoco fatuo: niente sprite, è disegnato a mano (alone, coda, corpo, occhi che guardano dove va)
function drawWisp(en, frozen, blinkWhite) {
    if (en.state === 'dormant') return;
    const z = config.zoom;
    const cx = toScreenX(en.x + en.w / 2), cy = toScreenY(en.y + en.h / 2);
    const R = en.w * z * 0.55;
    if (cx < -R * 8 || cy < -R * 8 || cx > config.viewportWidth + R * 8 || cy > config.viewportHeight + R * 8) return;
    const t = Date.now() * 0.001 + en.seed;
    // colori della lava (ghiaccio quando è congelato dal timer)
    // colori della lava, o blu per il secondo fuoco fatuo (ghiaccio quando è congelato dal timer)
    const pal = en.blue ? WISP_BLUE : WISP_RED;
    const halo = frozen ? (blinkWhite ? '#ffffff' : '#bfeaff') : pal.halo;
    const body = frozen ? '#dff4ff' : pal.body;
    const core = frozen ? '#ffffff' : pal.core;
    const pulse = 0.8 + Math.sin(t * 4) * 0.2;
    // comparsa: braci che convergono e anello di fuoco, poi il corpo si gonfia con un piccolo rimbalzo
    const k = en.state === 'appearing' ? en.appear : 1;
    if (k < 1) drawWispSummon(cx, cy, R, k, t, pal);
    const grow = Math.max(0, (k - 0.45) / 0.55);
    if (grow <= 0) return;
    const r = R * (1 + 0.25 * Math.sin(grow * Math.PI)) * grow;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // alone grande e morbido + alone stretto e intenso, che pulsano
    const g1 = r * 8 * (0.92 + 0.08 * pulse), g2 = r * 3.6;
    ctx.globalAlpha = 0.75 * pulse;
    ctx.drawImage(glowSprite(halo), cx - g1 / 2, cy - g1 / 2, g1, g1);
    ctx.globalAlpha = 1;
    ctx.drawImage(glowSprite(halo), cx - g2 / 2, cy - g2 / 2, g2, g2);
    // coda a cometa
    en.trail.forEach((p, i) => {
        const k = 1 - (i + 1) / (en.trail.length + 1);
        const tr = r * (0.45 + 0.6 * k) * 2.4;
        ctx.globalAlpha = 0.8 * k;
        ctx.drawImage(glowSprite(halo), toScreenX(p.x) - tr / 2, toScreenY(p.y) - tr / 2, tr, tr);
    });
    // due scintille che gli girano attorno
    ctx.fillStyle = pal.spark;
    for (let i = 0; i < 2; i++) {
        const a = t * 3 + i * Math.PI;
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 9 + i);
        const sr = Math.max(1, r * 0.11);
        ctx.fillRect(cx + Math.cos(a) * r * 1.6 - sr, cy + Math.sin(a) * r * 0.9 - sr, sr * 2, sr * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    // corpo: un po' ondeggiante
    const wob = Math.sin(t * 6) * r * 0.06;
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r + wob, r - wob, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = core;
    ctx.globalAlpha = 0.6 + 0.3 * pulse;   // cuore incandescente che pulsa
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.2, cy - r * 0.25, r * 0.5, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    // occhi
    ctx.globalAlpha = 1;
    const look = Math.atan2(en.vy, en.vx);
    const ex = Math.cos(look) * r * 0.18, ey = Math.sin(look) * r * 0.18;
    [-1, 1].forEach(s => {
        const x = cx + s * r * 0.34 + ex, y = cy - r * 0.05 + ey;
        ctx.fillStyle = pal.eye;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.17, r * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x - r * 0.05, y - r * 0.08, r * 0.06, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

// Evocazione: 10 braci che spiraleggiano verso il centro e un anello di fuoco che si stringe
function drawWispSummon(cx, cy, R, k, t, pal) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const fade = Math.min(1, k * 4) * Math.min(1, (1 - k) * 5);
    const g = R * (3 + 6 * k);
    ctx.globalAlpha = 0.8 * fade;
    ctx.drawImage(glowSprite(pal.halo), cx - g / 2, cy - g / 2, g, g);
    for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5 + k * 5 + t;
        const d = R * 7 * (1 - k);
        const s = Math.max(1.5, R * (0.12 + 0.12 * k));
        ctx.globalAlpha = fade;
        ctx.fillStyle = pal.ember[i % 2];
        ctx.fillRect(cx + Math.cos(a) * d - s, cy + Math.sin(a) * d - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = pal.ring;
    ctx.lineWidth = Math.max(2, R * 0.18);
    ctx.beginPath();
    ctx.arc(cx, cy, R * (4.5 * (1 - k) + 0.6), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawWisps() {
    const frozen = timerPowerUp.active;
    const blinkWhite = frozen && timerPowerUp.timeLeft < 3 && Math.floor(timerPowerUp.timeLeft * 5) % 2 === 0;
    enemies.forEach(en => { if (en.type === 'W') drawWisp(en, frozen, blinkWhite); });
}

// Anello del conto alla rovescia attorno a Icarous durante il power-up timer
function drawTimerRing() {
    if (!timerPowerUp.active || player.isDying || gameState.won) return;
    const cx = toScreenX(player.x + player.w / 2);
    const cy = toScreenY(player.y + player.h / 2);
    const r = player.w * config.zoom * 0.85;
    const frac = timerPowerUp.timeLeft / 10;
    ctx.save();
    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(80, 140, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = timerPowerUp.timeLeft < 3 ? '#ffffff' : '#5aa0ff';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();
    ctx.restore();
}

/* ===================== LUCE DINAMICA ===================== */

function lightHole(x, y, r, strength) {
    if (r <= 0) return;
    lctx.globalAlpha = strength;
    lctx.drawImage(lightSprite, x - r, y - r, r * 2, r * 2);
}

function inView(x, y, margin) {
    return x > -margin && y > -margin && x < config.viewportWidth + margin && y < config.viewportHeight + margin;
}

function drawLighting() {
    if (!settings.lighting) return;
    let darkness = 0.62;
    if (gameState.won) darkness *= Math.max(0, 1 - gameState.victoryTime / 90);   // a vittoria si accende tutto
    if (darkness <= 0.01) return;

    const vw = config.viewportWidth, vh = config.viewportHeight;
    const tz = config.tileSize * config.zoom;
    lctx.setTransform(LIGHT_RES, 0, 0, LIGHT_RES, 0, 0);
    lctx.globalAlpha = 1;
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, vw, vh);
    lctx.fillStyle = `rgba(3, 4, 12, ${darkness})`;
    lctx.fillRect(0, 0, vw, vh);
    lctx.globalCompositeOperation = 'destination-out';

    // Alone del giocatore: si restringe quando l'energia cala, si allarga con le lampadine
    const powerRatio = Math.max(0, Math.min(1, gameState.power / gameState.maxPower));
    const flicker = 1 + Math.sin(Date.now() * 0.011) * 0.015 + Math.sin(Date.now() * 0.029) * 0.01;
    const pr = tz * (8 + 12 * powerRatio + 7 * fx.lightBoost) * flicker;
    lightHole(toScreenX(player.x + player.w / 2), toScreenY(player.y + player.h / 2), pr, 1);

    // La lava illumina
    const lavaFlicker = 0.75 + Math.sin(lavaAnimTime.value * 2.3) * 0.1;
    lavas.forEach(l => {
        const step = tz * 4;
        const sx = toScreenX(l.x), sy = toScreenY(l.y), sw = l.w * config.zoom;
        if (!inView(sx + sw / 2, sy, sw / 2 + tz * 6)) return;
        for (let x = sx + step / 2; x < sx + sw; x += step) lightHole(x, sy, tz * 5, lavaFlicker);
    });

    // Oggetti e obiettivi brillano un po' anche al buio
    items.forEach(i => {
        if (i.taken) return;
        const x = toScreenX(i.x + i.w / 2), y = toScreenY(i.y + i.h / 2);
        if (!inView(x, y, tz * 4)) return;
        lightHole(x, y, tz * (i.type === 'bulb' ? 3.5 : 2.6), 0.65);
    });
    decorations.forEach(d => {
        const x = toScreenX(d.x + d.w / 2), y = toScreenY(d.y + d.h / 2);
        if (inView(x, y, tz * 5)) lightHole(x, y, tz * 4, 0.75);
    });
    triggers.forEach(t => {
        if (t.type === 'door') return;
        const x = toScreenX(t.x + t.w / 2), y = toScreenY(t.y + t.h / 2);
        if (inView(x, y, tz * 4)) lightHole(x, y, tz * 2.6, 0.55);
    });
    enemies.forEach(en => {
        if (en.state === 'dormant') return;
        const x = toScreenX(en.x + en.w / 2), y = toScreenY(en.y + en.h / 2);
        const wisp = en.type === 'W';   // il fuoco fatuo fa luce da solo
        if (inView(x, y, tz * 5)) lightHole(x, y, tz * (wisp ? 4.5 : 2), wisp ? 0.8 : 0.35);
    });

    lctx.globalAlpha = 1;
    ctx.drawImage(lightCanvas, 0, 0, vw, vh);
    // (tolta la luce calda additiva attorno al giocatore: si vedeva appena e pesava quanto mezzo frame)
}

/* ===================== RADAR (stile GTA) E FRECCIA ===================== */

function currentTarget() {
    if (!gameState.hasKey) {
        const key = items.find(i => i.type === 'key' && !i.taken);
        if (key) return { x: key.x + key.w / 2, y: key.y + key.h / 2, color: '#FFD54A', label: 'KEY' };
    }
    const woman = decorations.find(d => d.type === 'woman');
    if (woman) return { x: woman.x + woman.w / 2, y: woman.y + woman.h / 2, color: '#FF6FAE', label: 'GIRL' };
    return null;
}

function drawArrowHead(c, x, y, angle, size, color) {
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.beginPath();
    c.moveTo(size, 0);
    c.lineTo(-size * 0.7, -size * 0.75);
    c.lineTo(-size * 0.35, 0);
    c.lineTo(-size * 0.7, size * 0.75);
    c.closePath();
    c.fillStyle = color;
    c.fill();
    c.lineWidth = 1.5;
    c.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    c.stroke();
    c.restore();
}

function drawRadar() {
    if (!minimap || gameState.won) return;
    // Il radar scala con l'altezza dello schermo e sta sotto la pillola di sinistra dell'HUD
    const vh = config.viewportHeight;
    const R = Math.round(Math.max(36, Math.min(72, vh * 0.085)));
    const pad = 12;
    const cx = config.safeLeft + pad + R, cy = config.hudBottom + 10 + R;
    const ts = config.tileSize;
    const ppt = R / 24;   // il radar mostra ~24 tile di raggio
    const ptx = (player.x + player.w / 2) / ts;
    const pty = (player.y + player.h / 2) / ts;
    const toRadar = (wx, wy) => [cx + (wx / ts - ptx) * ppt, cy + (wy / ts - pty) * ppt];
    const pulse = 0.5 + Math.sin(Date.now() * 0.008) * 0.5;

    ctx.save();
    // vetro del radar
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 16, 32, 0.62)';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.85;
    ctx.drawImage(minimap, cx - ptx * ppt, cy - pty * ppt, minimap.width / MINI_PX * ppt, minimap.height / MINI_PX * ppt);
    ctx.globalAlpha = 1;
    // porte chiuse
    ctx.fillStyle = '#4fd8ff';
    triggers.forEach(t => {
        if (t.type === 'door' && !t.open) {
            const [x, y] = toRadar(t.x, t.y);
            ctx.fillRect(x, y, Math.max(1.5, t.w / ts * ppt), Math.max(1.5, t.h / ts * ppt));
        }
    });
    // nemici
    ctx.fillStyle = timerPowerUp.active ? '#bfeaff' : '#ff4d5e';
    enemies.forEach(en => {
        if (en.state === 'dormant') return;
        const [x, y] = toRadar(en.x + en.w / 2, en.y + en.h / 2);
        ctx.beginPath();
        ctx.arc(x, y, en.type === 'W' ? 3.4 : 2.2, 0, Math.PI * 2);
        if (en.type === 'W' && !timerPowerUp.active) { ctx.fillStyle = '#ffb347'; ctx.fill(); ctx.fillStyle = '#ff4d5e'; }
        else ctx.fill();
    });
    // checkpoint
    const flag = items.find(i => i.type === 'flag');
    if (flag) {
        const [x, y] = toRadar(flag.x + flag.w / 2, flag.y + flag.h / 2);
        ctx.fillStyle = flag.taken ? 'rgba(124, 255, 178, 0.45)' : '#7CFFB2';
        ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
    }
    // lampadine
    ctx.fillStyle = '#fff3a0';
    items.forEach(i => {
        if (i.type !== 'bulb' || i.taken) return;
        const [x, y] = toRadar(i.x + i.w / 2, i.y + i.h / 2);
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();

    // obiettivo: blip dentro il radar o freccia sul bordo
    const target = currentTarget();
    if (target) {
        const [tx, ty] = toRadar(target.x, target.y);
        const dx = tx - cx, dy = ty - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > R - 9) {
            const a = Math.atan2(dy, dx);
            drawArrowHead(ctx, cx + Math.cos(a) * (R - 9), cy + Math.sin(a) * (R - 9), a, 7 + pulse * 2, target.color);
        } else {
            ctx.beginPath();
            ctx.arc(tx, ty, 4 + pulse * 5, 0, Math.PI * 2);
            ctx.strokeStyle = target.color;
            ctx.globalAlpha = 1 - pulse * 0.7;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(tx, ty, 4, 0, Math.PI * 2);
            ctx.fillStyle = target.color;
            ctx.fill();
        }
    }

    // giocatore al centro
    drawArrowHead(ctx, cx, cy, player.facing === 1 ? 0 : Math.PI, 6, '#ffffff');

    // cornice in vetro
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, R - 3, Math.PI * 1.1, Math.PI * 1.65);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.stroke();

    // etichetta obiettivo + distanza
    if (target) {
        const distTiles = Math.round(Math.hypot(target.x / ts - ptx, target.y / ts - pty));
        ctx.font = `600 12px ${FONT_TEXT}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        const label = `${target.label} · ${distTiles}`;
        const w = ctx.measureText(label).width + 16;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(cx - w / 2, cy + R + 6, w, 20, 10); else ctx.rect(cx - w / 2, cy + R + 6, w, 20);
        ctx.fill();
        ctx.fillStyle = target.color;
        ctx.fillText(label, cx, cy + R + 20);
    }
    ctx.restore();
}

// Freccia sul bordo dello schermo quando l'obiettivo è fuori vista
function drawEdgeArrow() {
    const target = currentTarget();
    if (!target || gameState.won || player.isDying) return;
    const x = toScreenX(target.x), y = toScreenY(target.y);
    const vw = config.viewportWidth, vh = config.viewportHeight;
    if (x > 0 && x < vw && y > 0 && y < vh) return;
    const cx = vw / 2, cy = vh / 2;
    const a = Math.atan2(y - cy, x - cx);
    const inset = 34;
    const kx = (vw / 2 - inset) / Math.abs(Math.cos(a) || 1e-6);
    const ky = (vh / 2 - inset) / Math.abs(Math.sin(a) || 1e-6);
    const k = Math.min(kx, ky);
    const pulse = 0.5 + Math.sin(Date.now() * 0.008) * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.6 + pulse * 0.4;
    drawArrowHead(ctx, cx + Math.cos(a) * k, cy + Math.sin(a) * k, a, 13 + pulse * 3, target.color);
    ctx.restore();
}

/* ===================== SCHERMI E TRANSIZIONI ===================== */

// Bordi che sfumano nel nero: la grotta "continua" oltre lo schermo
let vignette = null, vignetteTop = null, vignetteKey = '';
function drawEdgeVignette() {
    const vw = config.viewportWidth, vh = config.viewportHeight;
    const key = vw + 'x' + vh + 'x' + config.hudBottom;
    if (vignetteKey !== key) {
        vignetteKey = key;
        const r = Math.hypot(vw, vh) / 2;
        vignette = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.42, vw / 2, vh / 2, r);
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
        vignetteTop = ctx.createLinearGradient(0, 0, 0, config.hudBottom + 30);
        vignetteTop.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
        vignetteTop.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, vw, vh);
    // ombra leggera in alto, sotto le pillole dell'HUD
    ctx.fillStyle = vignetteTop;
    ctx.fillRect(0, 0, vw, config.hudBottom + 30);
}

function drawLowPowerVignette() {
    const ratio = gameState.power / gameState.maxPower;
    if (ratio > 0.25 || player.isDying || gameState.won || gameState.god) return;
    const vw = config.viewportWidth, vh = config.viewportHeight;
    const strength = (1 - ratio / 0.25) * (0.35 + Math.sin(Date.now() * 0.008) * 0.15);
    const g = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.35, vw / 2, vh / 2, vw * 0.7);
    g.addColorStop(0, 'rgba(255, 0, 40, 0)');
    g.addColorStop(1, `rgba(255, 0, 40, ${strength})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
}

function drawTitleCard() {
    const t = fx.titleTime;
    if (gameState.won) return;
    const vw = config.viewportWidth, vh = config.viewportHeight;
    const dur = 3.2;
    if (t <= dur) {
        const a = Math.min(1, t / 0.4) * Math.min(1, (dur - t) / 0.6);
        const slide = (1 - Math.min(1, t / 0.5)) * 30;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${Math.round(vh * 0.13)}px ${FONT_TITLE}`;
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        const title = isLab ? 'LAB' : (gameState.levelTitle || `LEVEL ${String(gameState.levelNumber).padStart(2, '0')}`);
        ctx.strokeText(title, vw / 2 + slide, vh * 0.2);   // in alto: al centro c'è Icarous
        ctx.fillStyle = '#ffffff';
        ctx.fillText(title, vw / 2 + slide, vh * 0.2);
        ctx.font = `500 ${Math.round(vh * 0.035)}px ${FONT_TEXT}`;
        ctx.lineWidth = 4;
        const sub = gameState.levelName || 'Grab the key · free the girl';
        ctx.strokeText(sub, vw / 2 - slide, vh * 0.3);
        ctx.fillStyle = '#F89520';
        ctx.fillText(sub, vw / 2 - slide, vh * 0.3);
        ctx.restore();
    }
    if (gameState.levelIntro) drawIntroPanel(t, vw, vh);
}

// Riga di trama in un pannello "vetro" in basso al centro: resta più a lungo del titolo
function drawIntroPanel(t, vw, vh) {
    const start = 0.6, dur = 9;
    const lt = t - start;
    if (lt < 0 || lt > dur) return;
    const a = Math.min(1, lt / 0.5) * Math.min(1, (dur - lt) / 0.8);
    const fs = Math.max(13, Math.round(vh * 0.032));
    ctx.save();
    ctx.font = `italic 500 ${fs}px ${FONT_TEXT}`;
    const maxW = Math.min(vw * 0.8, fs * 30);
    // a capo automatico (al massimo 2-3 righe)
    const lines = [];
    let line = '';
    gameState.levelIntro.split(' ').forEach(w => {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    });
    if (line) lines.push(line);
    const lh = fs * 1.35, padX = fs * 1.1, padY = fs * 0.7;
    const W = Math.max(...lines.map(l => ctx.measureText(l).width)) + padX * 2;
    const H = lines.length * lh + padY * 2;
    const x = vw / 2 - W / 2;
    const y = vh * 0.84 - H / 2 + (1 - Math.min(1, lt / 0.5)) * 12;
    ctx.globalAlpha = a;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, W, H, H / 2 > 26 ? 18 : H / 2); else ctx.rect(x, y, W, H);
    ctx.fillStyle = 'rgba(10, 18, 30, 0.72)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F5F1E8';
    lines.forEach((l, i) => ctx.fillText(l, vw / 2, y + padY + lh * (i + 0.5)));
    ctx.restore();
}

function fmtTime(s) {
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

// Cartellino del punteggio a fine livello (le righe compaiono una alla volta)
function drawScoreCard() {
    const r = gameState.lastResult;
    if (!r) return;
    const t = gameState.victoryTime;   // in "frame" da 1/60 s
    const vw = config.viewportWidth, vh = config.viewportHeight;
    const appear = Math.min(1, Math.max(0, (t - 30) / 20));
    if (appear <= 0) return;

    const W = Math.min(440, vw * 0.8), H = Math.min(370, vh * 0.86);
    const x = vw / 2 - W / 2, y = vh / 2 - H / 2 + (1 - appear) * 30;
    ctx.save();
    ctx.globalAlpha = appear;
    ctx.fillStyle = 'rgba(12, 18, 34, 0.72)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, W, H, 22); else ctx.rect(x, y, W, H);
    ctx.fill();
    ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.round(H * 0.11)}px ${FONT_TITLE}`;
    ctx.fillText(isLab ? 'TEST LEVEL CLEARED' : 'LEVEL COMPLETE', vw / 2, y + H * 0.12);

    const rows = [
        ['Time', fmtTime(r.time), `+${r.timeBonus}`],
        ['Stars', `× ${r.stars}`, `+${r.stars * 100}`],
        ['Bulbs', `× ${r.bulbs}`, `+${r.bulbs * 50}`],
        ['Puppy', r.flags ? 'rescued' : '—', `+${r.flags * 250}`],
        ['Energy left', `${Math.round(r.power * 100)}%`, `+${Math.round(r.power * 1000)}`],
        ['Restarts', `× ${r.deaths}`, r.deaths ? `-${r.deaths * 500}` : '0']
    ];
    ctx.font = `500 ${Math.round(H * 0.048)}px ${FONT_TEXT}`;
    rows.forEach((row, i) => {
        const ra = Math.min(1, Math.max(0, (t - 45 - i * 10) / 10));
        if (ra <= 0) return;
        const ry = y + H * (0.27 + i * 0.085);
        ctx.globalAlpha = appear * ra;
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fillText(row[0], x + W * 0.08, ry);
        ctx.textAlign = 'center';
        ctx.fillText(row[1], x + W * 0.6, ry);
        ctx.textAlign = 'right';
        ctx.fillStyle = row[2].startsWith('-') ? '#ff7a8a' : '#9dffc4';
        ctx.fillText(row[2], x + W * 0.92, ry);
    });

    const ta = Math.min(1, Math.max(0, (t - 115) / 15));
    if (ta > 0) {
        const shown = Math.round(r.score * Math.min(1, (t - 115) / 45));
        ctx.globalAlpha = appear * ta;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#F89520';
        ctx.font = `${Math.round(H * 0.13)}px ${FONT_TITLE}`;
        ctx.fillText(shown.toLocaleString('en-US'), vw / 2, y + H * 0.83);
        ctx.font = `600 ${Math.round(H * 0.045)}px ${FONT_TEXT}`;
        if (r.isRecord && t > 165) {
            ctx.fillStyle = Math.floor(t / 12) % 2 ? '#FFE066' : '#ffffff';
            ctx.fillText('NEW RECORD!', vw / 2, y + H * 0.94);
        } else if (r.best) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillText(`Best: ${r.best.toLocaleString('en-US')}`, vw / 2, y + H * 0.94);
        }
    }
    ctx.restore();
}

/* ===================== HUD (DOM) ===================== */

let hudCache = {};
function setText(id, value) {
    if (hudCache[id] === value) return;
    hudCache[id] = value;
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

export function updateHUD(currentLevelNumber, gameRunning) {
    if (!gameRunning) return;
    setText('level-display', isLab ? 'T' : currentLevelNumber.toString().padStart(2, '0'));
    setText('stars-display', String(gameState.stars));
    setText('bulbs-display', String(gameState.bulbs));

    const powerBar = document.getElementById('power-bar');
    if (powerBar) {
        const percentage = Math.max(0, Math.min(100, (gameState.power / gameState.maxPower) * 100));
        const pct = percentage.toFixed(1) + '%';
        if (hudCache.power !== pct) {
            hudCache.power = pct;
            powerBar.style.width = pct;
            powerBar.dataset.level = percentage > 50 ? 'ok' : percentage > 25 ? 'mid' : 'low';
        }
    }

    const timerChip = document.getElementById('timer-chip');
    if (timerChip) {
        const active = timerPowerUp.active;
        if (hudCache.timerActive !== active) {
            hudCache.timerActive = active;
            timerChip.classList.toggle('show', active);
        }
        if (active) setText('timer-display', String(Math.ceil(timerPowerUp.timeLeft)));
    }
}

export function resetHUDCache() { hudCache = {}; }

/* ===================== DRAW PRINCIPALE ===================== */

export function draw(gameRunning) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, config.viewportWidth, config.viewportHeight);
    if (!gameRunning || !wallEdges) return;

    drawBackground();
    drawWalls();
    lavas.forEach(drawLava);

    triggers.forEach(t => {
        if (t.type === 'door' && !t.open) drawImg(sprites.door, t.x, t.y, t.w / config.tileSize, t.h / config.tileSize);
        if (t.type === 'open' || t.type === 'close') drawSwitch(t);
    });

    drawLavaParticles();
    drawDustParticles();

    items.forEach(i => {
        if (i.taken) return;
        if (i.type === 'star') drawStarGlow(i);
        // il cagnolino nel PNG ha 8 px vuoti sotto le zampe: lo abbassiamo per poggiarlo sul pavimento
        else if (i.type === 'flag') drawImg(sprites.flag, i.x, i.y + i.h * 0.05, i.w / config.tileSize, i.h / config.tileSize);
        else drawImg(sprites[i.type], i.x, i.y, i.w / config.tileSize, i.h / config.tileSize);
    });
    decorations.forEach(d => {
        if (d.type === 'woman' && !gameState.won) drawImg(sprites.woman, d.x, d.y, d.w / config.tileSize, d.h / config.tileSize);
    });
    drawEnemies();

    if (gameState.won) {
        const img = sprites.unchained;
        if (img && img.complete) {
            const larghezzaInTile = 3.5;
            const altezzaInTile = larghezzaInTile * img.naturalHeight / img.naturalWidth;
            const offsetX = (larghezzaInTile * config.tileSize - gameState.vW) / 2;
            const offsetY = (altezzaInTile * config.tileSize - gameState.vH);
            drawImg(img, gameState.vX - offsetX, gameState.vY - offsetY, larghezzaInTile, altezzaInTile);
        }
    } else {
        drawWaxPuddle();
        drawPlayer();
    }

    drawDeathParticles();
    drawFeathers();
    drawColorParticles();
    drawLighting();
    drawWisps();   // il fuoco fatuo è una luce: sta sopra il buio
    drawTimerRing();
    if (gameState.won) drawFireworkParticles();
    drawFloatTexts();
    drawEdgeVignette();
    drawLowPowerVignette();

    if (gameState.gameOver) {
        ctx.fillStyle = 'rgba(50, 0, 0, 0.6)';
        ctx.fillRect(0, 0, config.viewportWidth, config.viewportHeight);
    }

    drawEdgeArrow();
    drawRadar();
    drawTitleCard();
    if (gameState.won) {
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.45, gameState.victoryTime / 100)})`;
        ctx.fillRect(0, 0, config.viewportWidth, config.viewportHeight);
        drawScoreCard();
    }

    if (fx.flash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${fx.flash * 0.6})`;
        ctx.fillRect(0, 0, config.viewportWidth, config.viewportHeight);
    }
    const black = Math.max(fx.fadeIn, fx.fadeOut);
    if (black > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${black})`;
        ctx.fillRect(0, 0, config.viewportWidth, config.viewportHeight);
    }
}
