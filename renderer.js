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

// Lo sfondo fotografico viene sfocato e desaturato: così non "litiga" con gli sprite cartoon
function buildBackground(img) {
    const targetW = 1600;
    const targetH = Math.round(targetW * img.naturalHeight / img.naturalWidth);
    const small = document.createElement('canvas');
    small.width = Math.round(targetW / 5);
    small.height = Math.round(targetH / 5);
    const sctx = small.getContext('2d');
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(img, 0, 0, small.width, small.height);

    const out = document.createElement('canvas');
    out.width = targetW;
    out.height = targetH;
    const octx = out.getContext('2d');
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(small, 0, 0, targetW, targetH);
    octx.globalCompositeOperation = 'saturation';
    octx.globalAlpha = 0.45;
    octx.fillStyle = 'hsl(0, 0%, 50%)';
    octx.fillRect(0, 0, targetW, targetH);
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
    const scale = vH / bgCanvas.height;
    const scaledW = bgCanvas.width * scale;
    const scaledH = vH;
    const offX = ((camera.x * PARALLAX_FACTOR) % scaledW + scaledW) % scaledW;
    const offY = ((camera.y * PARALLAX_FACTOR) % scaledH + scaledH) % scaledH;
    for (let tx = -offX; tx < vW; tx += scaledW) {
        ctx.drawImage(bgCanvas, tx, -offY, scaledW, scaledH);
        if (offY !== 0) ctx.drawImage(bgCanvas, tx, -offY + scaledH, scaledW, scaledH);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, vW, vH);
}

/* ===================== INIZIALIZZAZIONE E CACHE DEL LIVELLO ===================== */

let lightCanvas = null, lctx = null;
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

    if (isMobile) {
        // Su mobile shadowBlur è molto costoso: lo disattiviamo del tutto
        const originalSetter = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'shadowBlur').set;
        Object.defineProperty(ctx, 'shadowBlur', { set: function(val) { originalSetter.call(this, 0); } });
    }
}

// Chiamata da main.js quando la finestra cambia misura: la luce dinamica segue la tela
export function resizeRenderer(pixelRatio) {
    dpr = pixelRatio || 1;
    if (!lightCanvas) return;
    lightCanvas.width = canvas.width;
    lightCanvas.height = canvas.height;
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

    // 3) bordi: luce sopra, ombra sotto e ai lati (disegnati in blocco, costano poco)
    const hl = Math.max(1, tz * 0.12), dk = Math.max(1, tz * 0.16), sd = Math.max(1, tz * 0.1);
    const top = new Path2D(), bottom = new Path2D(), sides = new Path2D();
    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const e = wallEdges[y * cols + x];
            if (!e || (e & SHADOW)) continue;
            const sx = x * tz - camera.x, sy = y * tz - camera.y;
            if (e & EDGE_UP) top.rect(sx, sy, tz, hl);
            if (e & EDGE_DOWN) bottom.rect(sx, sy + tz - dk, tz, dk);
            if (e & EDGE_LEFT) sides.rect(sx, sy, sd, tz);
            if (e & EDGE_RIGHT) sides.rect(sx + tz - sd, sy, sd, tz);
        }
    }
    ctx.fillStyle = 'rgba(255, 236, 200, 0.30)';
    ctx.fill(top);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
    ctx.fill(bottom);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.20)';
    ctx.fill(sides);
}

/* ===================== LAVA ===================== */

function drawLava(l) {
    drawImg(sprites.lava, l.x, l.y, l.w / config.tileSize, l.h / config.tileSize);
    const sx = toScreenX(l.x);
    const sy = toScreenY(l.y);
    const sw = l.w * config.zoom;
    const tz = config.tileSize * config.zoom;
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
    dustParticles.forEach(p => {
        const px = toScreenX(p.x);
        const py = toScreenY(p.y);
        ctx.save();
        ctx.globalAlpha = p.life * 0.5;
        const particleSize = isFinite(p.size) && p.size > 0 ? p.size : 2;
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, particleSize);
        gradient.addColorStop(0, 'rgba(150, 150, 150, 0.8)');
        gradient.addColorStop(0.5, 'rgba(120, 120, 120, 0.5)');
        gradient.addColorStop(1, 'rgba(100, 100, 100, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, particleSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
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
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.beginPath();
        ctx.ellipse(0, 0, s, s * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(180, 190, 210, 0.9)';
        ctx.lineWidth = Math.max(0.6, s * 0.08);
        ctx.beginPath();
        ctx.moveTo(-s * 1.15, 0);
        ctx.lineTo(s * 0.9, 0);
        ctx.stroke();
        ctx.restore();
    });
}

function drawFireworkParticles() {
    fireworkParticles.forEach(p => {
        if (p.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.font = `${p.size * 2 * config.zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.type === 'heart' ? '❤️' : '⭐', toScreenX(p.x), toScreenY(p.y));
        ctx.restore();
    });
}

function drawColorParticles() {
    colorParticles.forEach(p => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(toScreenX(p.x), toScreenY(p.y), p.size * config.zoom, p.size * config.zoom);
        ctx.restore();
    });
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
    const img = sprites.thes;
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

// Riquadro di un fotogramma di png/thes_die.png (4 colonne × 2 righe)
function dieFrame(img, n) {
    const sw = img.naturalWidth / 4, sh = img.naturalHeight / 2;
    return [(n % 4) * sw, Math.floor(n / 4) * sh, sw, sh];
}

function drawDyingPlayer() {
    const img = sprites.thes_die;
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
    const img = sprites.thes_die;
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

function drawGlowingTrigger(x, y, w, h, color, text, pulseOffset = 0) {
    const sx = toScreenX(x);
    const sy = toScreenY(y);
    const sw = w * config.zoom;
    const sh = h * config.zoom;
    const pulse = Math.sin(Date.now() * 0.003 + pulseOffset) * 0.3 + 0.7;
    ctx.save();
    ctx.shadowBlur = 20 * pulse;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = pulse;
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.2 * pulse;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 15 * pulse;
    ctx.fillStyle = color;
    ctx.font = `${Math.min(sw * 0.24, sh * 0.34)}px ${FONT_TITLE}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, sx + sw / 2, sy + sh / 2);
    ctx.restore();
}

function drawStarGlow(item) {
    const img = sprites.star;
    if (!img || !img.complete) return;
    const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
    ctx.save();
    ctx.shadowBlur = 25 * pulse;
    ctx.shadowColor = '#ffff00';
    ctx.globalAlpha = pulse;
    ctx.drawImage(img, toScreenX(item.x), toScreenY(item.y), item.w * config.zoom, item.h * config.zoom);
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

// Anello del conto alla rovescia attorno a Theseus durante il power-up timer
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
    const g = lctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${strength})`);
    g.addColorStop(0.35, `rgba(0,0,0,${strength * 0.9})`);
    g.addColorStop(0.7, `rgba(0,0,0,${strength * 0.45})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g;
    lctx.fillRect(x - r, y - r, r * 2, r * 2);
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
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
        const x = toScreenX(en.x + en.w / 2), y = toScreenY(en.y + en.h / 2);
        if (inView(x, y, tz * 3)) lightHole(x, y, tz * 2, 0.35);
    });

    ctx.drawImage(lightCanvas, 0, 0, vw, vh);

    // Leggera luce calda attorno al giocatore
    const px = toScreenX(player.x + player.w / 2), py = toScreenY(player.y + player.h / 2);
    const g = ctx.createRadialGradient(px, py, 0, px, py, pr * 0.6);
    g.addColorStop(0, 'rgba(255, 190, 120, 0.08)');
    g.addColorStop(1, 'rgba(255, 190, 120, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    ctx.restore();
}

/* ===================== RADAR (stile GTA) E FRECCIA ===================== */

function currentTarget() {
    if (!gameState.hasKey) {
        const key = items.find(i => i.type === 'key' && !i.taken);
        if (key) return { x: key.x + key.w / 2, y: key.y + key.h / 2, color: '#FFD54A', label: 'CHIAVE' };
    }
    const woman = decorations.find(d => d.type === 'woman');
    if (woman) return { x: woman.x + woman.w / 2, y: woman.y + woman.h / 2, color: '#FF6FAE', label: 'RAGAZZA' };
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
        const [x, y] = toRadar(en.x + en.w / 2, en.y + en.h / 2);
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
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
let vignette = null, vignetteKey = '';
function drawEdgeVignette() {
    const vw = config.viewportWidth, vh = config.viewportHeight;
    const key = vw + 'x' + vh;
    if (vignetteKey !== key) {
        vignetteKey = key;
        const r = Math.hypot(vw, vh) / 2;
        vignette = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.42, vw / 2, vh / 2, r);
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    }
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, vw, vh);
    // ombra leggera in alto, sotto le pillole dell'HUD
    const top = ctx.createLinearGradient(0, 0, 0, config.hudBottom + 30);
    top.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    top.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = top;
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
        const title = isLab ? 'LABORATORIO' : (gameState.levelTitle || `LIVELLO ${String(gameState.levelNumber).padStart(2, '0')}`);
        ctx.strokeText(title, vw / 2 + slide, vh * 0.2);   // in alto: al centro c'è Theseus
        ctx.fillStyle = '#ffffff';
        ctx.fillText(title, vw / 2 + slide, vh * 0.2);
        ctx.font = `500 ${Math.round(vh * 0.035)}px ${FONT_TEXT}`;
        ctx.lineWidth = 4;
        const sub = gameState.levelName || 'Prendi la chiave · salva la ragazza';
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
    ctx.fillText(isLab ? 'LIVELLO DI TEST SUPERATO' : 'LIVELLO COMPLETATO', vw / 2, y + H * 0.12);

    const rows = [
        ['Tempo', fmtTime(r.time), `+${r.timeBonus}`],
        ['Stelle', `× ${r.stars}`, `+${r.stars * 100}`],
        ['Lampadine', `× ${r.bulbs}`, `+${r.bulbs * 50}`],
        ['Cagnolino', r.flags ? 'preso' : '—', `+${r.flags * 250}`],
        ['Energia residua', `${Math.round(r.power * 100)}%`, `+${Math.round(r.power * 1000)}`],
        ['Ripartenze', `× ${r.deaths}`, r.deaths ? `-${r.deaths * 500}` : '0']
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
        ctx.fillText(shown.toLocaleString('it-IT'), vw / 2, y + H * 0.83);
        ctx.font = `600 ${Math.round(H * 0.045)}px ${FONT_TEXT}`;
        if (r.isRecord && t > 165) {
            ctx.fillStyle = Math.floor(t / 12) % 2 ? '#FFE066' : '#ffffff';
            ctx.fillText('NUOVO RECORD!', vw / 2, y + H * 0.94);
        } else if (r.best) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillText(`Record: ${r.best.toLocaleString('it-IT')}`, vw / 2, y + H * 0.94);
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
        if (t.type === 'open') drawGlowingTrigger(t.x, t.y, t.w, t.h, '#00ffff', 'OPEN', 0);
        if (t.type === 'close') drawGlowingTrigger(t.x, t.y, t.w, t.h, '#ff6600', 'CLOSE', Math.PI);
    });

    drawLavaParticles();
    drawDustParticles();

    items.forEach(i => {
        if (i.taken) return;
        if (i.type === 'star') drawStarGlow(i);
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
