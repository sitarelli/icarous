/* -------------------------------------------------------------------------- */
/* MAIN - ENTRY POINT DEL GIOCO                                               */
/* -------------------------------------------------------------------------- */

import { config, gameState, player, keys, fx, timerPowerUp, CAMPAIGNS, isLab, labSource, settings, setCurrentLevelNumber, setGameRunning, setCurrentMap, setItems, setEnemies, setTriggers, setDecorations, setLavas, clearParticles, currentLevelNumber, gameRunning, isMobile } from './config.js';
import { initInput, pollGamepad, requestFullscreen, setFullscreenActivated } from './input.js';
import { update, respawnPlayer, respawnAtCheckpoint, updateCamera, addFloatText, playerDie, createWisp } from './player.js';
import { initRenderer, resizeRenderer, draw, updateHUD, resetHUDCache, setBackgroundForLevel, prepareLevel } from './renderer.js';
import { getUnlocked, getBest, unlockLevel, recordResult, totalBestScore, saveSettings, resetProgress, getCampaign, setCampaign } from './save.js';

// Campagna in uso (Originale o Vitto Levels)
const camp = () => CAMPAIGNS[getCampaign()] || CAMPAIGNS.originale;


// Canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let dpr = 1;

// La tela prende tutta la finestra. La risoluzione interna ha un tetto di pixel,
// così su un monitor 4K o su un telefono il gioco non rallenta.
const MAX_CANVAS_PIXELS = isMobile ? 1.8e6 : 3.2e6;
function resizeCanvas() {
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    const native = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    dpr = Math.max(0.75, Math.min(native, Math.sqrt(MAX_CANVAS_PIXELS / (w * h))));
    config.viewportWidth = w;
    config.viewportHeight = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    resizeRenderer(dpr);
    measureHud();
    applyZoom();
    if (gameRunning) updateCamera(true);
}

// Il canvas non conosce il CSS: gli passiamo notch e posizione delle pillole dell'HUD
function measureHud() {
    config.safeLeft = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-left')) || 0;
    const pill = document.querySelector('.hud-left');
    const r = pill ? pill.getBoundingClientRect() : null;
    config.hudBottom = r && r.height ? r.bottom : 60;
}

// Si vedono sempre ~23 tile in verticale (su telefono ×1,5 per sprite più grandi), per il "+ / −" dell'utente
function applyZoom() {
    if (!config.tileSize) return;
    config.zoom = config.viewportHeight / (23 * config.tileSize) * (isMobile ? 1.5 : 1) * config.userZoom;
}

let resizeQueued = false;
function queueResize() {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => { resizeQueued = false; resizeCanvas(); });
}
window.addEventListener('resize', queueResize);
window.addEventListener('orientationchange', () => setTimeout(queueResize, 300));
if (window.visualViewport) window.visualViewport.addEventListener('resize', queueResize);

// --- SPRITES ---
const sprites = {};
let loadedImages = 0;
const imagesToLoad = [
    { name: 'brick', src: 'png/brick.png' },
    { name: 'icarous', src: 'png/icarous.png' },
    { name: 'woman', src: 'png/woman.png' },
    { name: 'enemyH', src: 'png/enemyh.png' },
    { name: 'enemyV', src: 'png/enemyv.png' },
    { name: 'enemyS', src: 'png/enemys.png' },
    { name: 'enemyX', src: 'png/enemyx.png' },
    { name: 'bulb', src: 'png/bulb.png' },
    { name: 'flag', src: 'png/flag.png' },
    { name: 'lava', src: 'png/lava.png' },
    { name: 'key', src: 'png/key.png' },
    { name: 'timer', src: 'png/timer.png' },
    { name: 'door', src: 'png/door.png' },
    { name: 'icarous_die', src: 'png/icarous_die.png' },
    { name: 'unchained', src: 'png/unchained.png' }
];

imagesToLoad.forEach(imgData => {
    const img = new Image();
    img.src = imgData.src;
    img.onload = () => { loadedImages++; updateProgress(); };
    img.onerror = () => { sprites[imgData.name] = null; loadedImages++; updateProgress(); };
    sprites[imgData.name] = img;
});

// --- AUDIO ---
const preferMP3 = (() => {
    const a = document.createElement('audio');
    return a.canPlayType('audio/mpeg') !== '';
})();

function aud(name) {
    return preferMP3 ? `audio/${name}.mp3` : `audio/${name}.ogg`;
}

const audioDefinitions = {
    doorOpen:   { src: aud('dooropen'),    volume: 0.6 },
    doorClose:  { src: aud('doorclose'),   volume: 0.6 },
    walk:       { src: aud('walking'), volume: 0.4, loop: true },
    fly:        { src: aud('flying'),  volume: 0.5, loop: true },
    levelup:    { src: aud('levelup'),     volume: 0.8 },
    beginLevel: { src: aud('beginlevel'),  volume: 0.7 },
    keyPickup:  { src: aud('key'),         volume: 0.6 },
    death:      { src: aud('death'),       volume: 0.7 },
    contact:    { src: aud('contact'),     volume: 0.6 },
    lava:       { src: aud('lava'),        volume: 0.5 },
    timer:      { src: aud('timer'),       volume: 0.5, loop: true },
    flagPickup: { src: aud('flag'),        volume: 0.6 }
};
export const sfx = {};

Object.keys(audioDefinitions).forEach(name => { sfx[name] = null; });

function loadSingleAudio(name, def) {
    return new Promise(resolve => {
        const audio = new Audio();
        audio.volume = def.volume || 1.0;
        audio.loop = def.loop || false;
        audio.preload = 'auto';
        let resolved = false;
        const done = () => { if (resolved) return; resolved = true; sfx[name] = audio; resolve(); };
        const fail = () => { if (resolved) return; resolved = true; sfx[name] = null; resolve(); };
        audio.addEventListener('canplaythrough', done, { once: true });
        audio.addEventListener('loadeddata', done, { once: true });
        audio.addEventListener('error', fail, { once: true });
        setTimeout(() => { if (!resolved) { if (audio.readyState >= 2) done(); else fail(); } }, 8000);
        audio.src = def.src;
        audio.load();
    });
}

function loadAllAudio(onProgress) {
    const entries = Object.entries(audioDefinitions);
    let done = 0;
    return Promise.all(entries.map(([name, def]) =>
        loadSingleAudio(name, def).then(() => {
            done++;
            if (onProgress) onProgress(done, entries.length);
        })
    ));
}

function updateProgress() {
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo && !audioReady) debugInfo.textContent = `Images: ${loadedImages}/${imagesToLoad.length}`;
}

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getOrCreateAudioContext() {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
}

export function playSound(type) {
    const audioCtx = getOrCreateAudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if (type === 'bonus') { osc.frequency.setValueAtTime(600, now); osc.frequency.linearRampToValueAtTime(1200, now + 0.1); gain.gain.setValueAtTime(0.1, now); osc.start(); osc.stop(now + 0.1); }
    if (type === 'key') { osc.frequency.setValueAtTime(880, now); gain.gain.setValueAtTime(0.1, now); osc.start(); osc.stop(now + 0.1); }
    if (type === 'die' || type === 'hit') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.2); gain.gain.setValueAtTime(0.2, now); osc.start(); osc.stop(now + 0.2); }
    if (type === 'open') { osc.type = 'triangle'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(800, now + 0.3); gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3); osc.start(); osc.stop(now + 0.3); }
    if (type === 'close') { osc.type = 'triangle'; osc.frequency.setValueAtTime(800, now); osc.frequency.linearRampToValueAtTime(400, now + 0.3); gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3); osc.start(); osc.stop(now + 0.3); }
    if (type === 'win') { osc.frequency.setValueAtTime(523, now); osc.frequency.setValueAtTime(659, now + 0.1); osc.frequency.setValueAtTime(784, now + 0.2); gain.gain.setValueAtTime(0.15, now); osc.start(); osc.stop(now + 0.4); }
}

// Comparsa del fuoco fatuo: lamento da fantasma + risata malefica, sintetizzati (nessun file audio),
// con un'eco da caverna. Dura circa 2,5 secondi.
export function playWispSound() {
    const ac = getOrCreateAudioContext();
    if (ac.state === 'suspended') ac.resume();
    const now = ac.currentTime;
    const master = ac.createGain();
    master.gain.value = 0.32;
    // eco: ritardo con ritorno
    const echo = ac.createDelay();
    echo.delayTime.value = 0.23;
    const feedback = ac.createGain();
    feedback.gain.value = 0.38;
    master.connect(ac.destination);
    master.connect(echo); echo.connect(feedback); feedback.connect(echo); echo.connect(ac.destination);

    // 1) lamento "uuuuoooh": due seni leggermente stonati, vibrato, sale e poi crolla
    const wail = ac.createGain();
    wail.gain.setValueAtTime(0.0001, now);
    wail.gain.exponentialRampToValueAtTime(0.5, now + 0.35);
    wail.gain.setValueAtTime(0.5, now + 0.9);
    wail.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1400;
    wail.connect(lp); lp.connect(master);
    const lfo = ac.createOscillator(), lfoGain = ac.createGain();
    lfo.frequency.value = 6.5; lfoGain.gain.value = 18;
    lfo.connect(lfoGain);
    [0, 7].forEach(detune => {
        const o = ac.createOscillator();
        o.type = 'sine';
        o.detune.value = detune * 10;
        o.frequency.setValueAtTime(230, now);
        o.frequency.exponentialRampToValueAtTime(540, now + 0.6);
        o.frequency.exponentialRampToValueAtTime(170, now + 1.5);
        lfoGain.connect(o.frequency);
        o.connect(wail);
        o.start(now); o.stop(now + 1.55);
    });
    lfo.start(now); lfo.stop(now + 1.55);

    // 2) risata "ah-ah-ah-ah-ah": voce a dente di sega filtrata sulla vocale "a", a scatti, che scende
    const voice = ac.createOscillator();
    voice.type = 'sawtooth';
    const formant = ac.createBiquadFilter();
    formant.type = 'bandpass'; formant.frequency.value = 750; formant.Q.value = 4;
    const laugh = ac.createGain();
    laugh.gain.value = 0.0001;
    voice.connect(formant); formant.connect(laugh); laugh.connect(master);
    const t0 = now + 1.05;
    for (let i = 0; i < 5; i++) {
        const t = t0 + i * 0.2;
        voice.frequency.setValueAtTime(185 - i * 14, t);
        voice.frequency.exponentialRampToValueAtTime(150 - i * 12, t + 0.14);
        laugh.gain.setValueAtTime(0.0001, t);
        laugh.gain.exponentialRampToValueAtTime(0.9 - i * 0.12, t + 0.03);
        laugh.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    }
    voice.start(t0); voice.stop(t0 + 1.1);
}

// Tic-tac dell'energia bassa: un colpetto secco di legno (tic acuto, tac più grave), sintetizzato
let tickHigh = true;
function playTick(urgency) {
    const ac = getOrCreateAudioContext();
    if (ac.state === 'suspended') return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const bp = ac.createBiquadFilter();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(tickHigh ? 1650 : 1180, now);
    osc.frequency.exponentialRampToValueAtTime(tickHigh ? 900 : 650, now + 0.04);
    bp.type = 'bandpass'; bp.frequency.value = tickHigh ? 2200 : 1500; bp.Q.value = 6;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18 + urgency * 0.12, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.connect(bp); bp.connect(gain); gain.connect(ac.destination);
    osc.start(now); osc.stop(now + 0.07);
    tickHigh = !tickHigh;
}

// Sotto il 25% di energia (stessa soglia della vignetta rossa) parte il tic-tac: più l'energia cala, più accelera
const LOW_POWER = 0.25;
let tickTimer = 0;
function updateLowPowerTick(dt) {
    const ratio = gameState.power / gameState.maxPower;
    if (ratio > LOW_POWER || ratio <= 0 || player.isDying || gameState.won || gameState.gameOver || gameState.god) {
        tickTimer = 0;
        return;
    }
    tickTimer -= dt;
    if (tickTimer <= 0) {
        const urgency = 1 - ratio / LOW_POWER;          // 0 appena sotto la soglia, 1 a energia zero
        playTick(urgency);
        tickTimer = 0.7 - urgency * 0.45;               // da 0,7 s a 0,25 s tra un colpo e l'altro
    }
}

// Safari fa suonare un elemento audio solo se è partito almeno una volta durante un clic o un tasto:
// i suoni del gioco partono dal ciclo di gioco, quindi al primo gesto li "sblocchiamo" tutti (play + pausa
// immediata) e poi suoniamo sempre quegli stessi elementi, mai copie nuove (che sarebbero di nuovo bloccate).
const _unlockedAudio = new WeakSet();
function unlockSounds() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    let pending = false;
    Object.values(sfx).forEach(audio => {
        if (!audio) { pending = true; return; }
        if (_unlockedAudio.has(audio)) return;
        _unlockedAudio.add(audio);
        if (!audio.paused) return;           // sta già suonando: è già sbloccato
        try { audio.play().catch(() => {}); audio.pause(); audio.currentTime = 0; } catch (e) {}
    });
    if (!pending) ['keydown', 'pointerdown', 'touchend'].forEach(ev => window.removeEventListener(ev, unlockSounds, true));
}
['keydown', 'pointerdown', 'touchend'].forEach(ev => window.addEventListener(ev, unlockSounds, true));

const _oneShotThrottle = new Set();
export function safePlayAudio(audio) {
    if (!audio || audio.readyState === 0) return;
    if (audio.loop) {
        if (!audio.paused) return;
        audio.play().catch(() => {});
    } else {
        if (_oneShotThrottle.has(audio)) return;
        _oneShotThrottle.add(audio);
        audio.onended = audio.onpause = audio.onerror = () => _oneShotThrottle.delete(audio);
        try { audio.currentTime = 0; } catch (e) {}
        audio.play().catch(() => { _oneShotThrottle.delete(audio); });
    }
}

export function stopAllSounds() {
    Object.values(sfx).forEach(audio => { if (audio) { try { audio.pause(); audio.currentTime = 0; } catch(e) {} } });
    _oneShotThrottle.clear();
}

// --- ZOOM ---
function initZoomControls() {
    const btnIn = document.getElementById('btn-zoom-in');
    const btnOut = document.getElementById('btn-zoom-out');
    if (!btnIn || !btnOut) return;

    const updateZoom = (delta) => {
        const next = Math.round((config.userZoom + delta) * 10) / 10;
        if (next >= 0.5 && next <= 2.5) {
            config.userZoom = next;   // resta valido anche cambiando livello o ridimensionando
            applyZoom();
        }
    };

    // Pointerdown gestisce Touch e Mouse senza lag
    const onPointerDown = (e, delta) => {
        e.preventDefault();
        e.stopPropagation();
        updateZoom(delta);
    };
    btnIn.onpointerdown = (e) => onPointerDown(e, 0.2);
    btnOut.onpointerdown = (e) => onPointerDown(e, -0.2);
}

/* ===================== OVERLAY (menu, pausa, game over, finale) ===================== */

const $ = id => document.getElementById(id);

function showOverlay(id, show) {
    const el = $(id);
    if (el) el.classList.toggle('show', show);
    const anyOpen = document.querySelector('.overlay.show');
    document.body.classList.toggle('game-active', !anyOpen);
}

function releaseKeys() {
    keys.left = keys.right = keys.up = false;
}

/* ===================== CARICAMENTO LIVELLI ===================== */

window.loadLevelData = function(data) { gameState.statusMessage = ""; initGame(data); };

function loadLevelSrc(src, onError) {
    const old = document.getElementById('level-script'); if (old) old.remove();
    const s = document.createElement('script');
    s.id = 'level-script';
    s.src = `${src}?v=${Date.now()}`;   // niente cache: utile mentre si disegnano i livelli
    s.onerror = onError;
    document.body.appendChild(s);
}

export function loadLevel(n) {
    setCurrentLevelNumber(n);
    gameState.levelNumber = n;
    const num = String(n).padStart(2, '0');
    gameState.levelTitle = getCampaign() === 'vitto' ? `NEW LEVEL ${num}` : `LEVEL ${num}`;
    const src = `${camp().dir}/level${n}.js`;
    loadLevelSrc(src, () => { alert(`Missing file ${src}`); showMenu(); });
}

// Laboratorio: livello da levels/test/, livello ufficiale (levels/levelN.js, levels/vitto/levelN.js)
// oppure file caricato dal computer (test.html)
const LAB_PATH = /^levels\/(test\/[\w\-. ]+|(vitto\/)?level\d+)\.js$/;
function loadLabLevel() {
    setCurrentLevelNumber(0);
    gameState.levelNumber = 0;
    if (labSource === 'local') {
        let text = null;
        try { text = sessionStorage.getItem('icarous_lab_level'); } catch (e) {}
        if (!text) { alert('No level loaded: go back to test.html and pick a file.'); return; }
        try { new Function(text)(); }
        catch (e) { alert('Error in the level file:\n' + e.message); }
    } else if (LAB_PATH.test(labSource)) {
        loadLevelSrc(labSource, () => alert('File not found: ' + labSource));
    } else {
        alert('Invalid path (must be a level inside levels/): ' + labSource);
    }
}

function reloadCurrentLevel() {
    if (isLab) loadLabLevel(); else loadLevel(currentLevelNumber);
}

function initGame(levelData) {
    if (!levelData) return;
    stopAllSounds();
    safePlayAudio(sfx.beginLevel);
    gameState.hasKey = false; gameState.hasFlag = false; gameState.doorOpen = false; gameState.won = false; gameState.victoryTime = 0; gameState.power = gameState.maxPower; gameState.gameOver = false;
    gameState.checkpoint = null;
    gameState.levelTime = 0;
    gameState.levelStats = { stars: 0, bulbs: 0, flags: 0, deaths: 0 };
    gameState.lastResult = null;
    gameState.levelName = levelData.name || '';
    gameState.levelIntro = levelData.intro || '';   // riga di trama facoltativa
    gameState.paused = false;
    timerPowerUp.active = false; timerPowerUp.timeLeft = 0;
    fx.hitStop = 0; fx.flash = 0; fx.lightBoost = 0; fx.fadeIn = 1; fx.fadeOut = 0; fx.titleTime = 0;
    fadeCallback = null;
    winTimer = 0;
    // Il livello può scegliere lo sfondo con il campo "background", altrimenti sfondoN = livello N
    setBackgroundForLevel(levelData.background || (isLab ? 3 : currentLevelNumber));
    config.tileSize = levelData.tileSize || 20;

    applyZoom();

    const tempItems = [], tempEnemies = [], tempTriggers = [], tempDecorations = [], tempLavas = [];
    clearParticles();
    const currentMap = JSON.parse(JSON.stringify(levelData.map));
    for (let y = 0; y < currentMap.length; y++) {
        for (let x = 0; x < currentMap[y].length; x++) {
            const cell = currentMap[y][x];
            const type = (typeof cell === 'object') ? cell.type : cell;
            const group = (typeof cell === 'object') ? cell.group : null;
            if (type === 0 || type === 1) continue;
            // Fonde le celle uguali adiacenti in un unico rettangolo (= una sola entità)
            let w = 1, h = 1;
            while (x + w < currentMap[y].length) {
                const nextCell = currentMap[y][x + w];
                const nextType = (typeof nextCell === 'object') ? nextCell.type : nextCell;
                const nextGroup = (typeof nextCell === 'object') ? nextCell.group : null;
                if (nextType !== type || nextGroup !== group) break;
                w++;
            }
            let canDown = true;
            while (canDown && y + h < currentMap.length) {
                for (let k = 0; k < w; k++) {
                    const checkCell = currentMap[y + h][x + k];
                    const checkType = (typeof checkCell === 'object') ? checkCell.type : checkCell;
                    const checkGroup = (typeof checkCell === 'object') ? checkCell.group : null;
                    if (checkType !== type || checkGroup !== group) canDown = false;
                }
                if (canDown) h++;
            }
            const pxW = w * config.tileSize, pxH = h * config.tileSize, pxX = x * config.tileSize, pxY = y * config.tileSize;
            if (type === 9) { player.w = pxW; player.h = pxH; player.startX = pxX; player.startY = pxY; respawnPlayer(); }
            else if (type === 2) tempLavas.push({ x: pxX, y: pxY, w: pxW, h: pxH });
            else if (type === 10) tempItems.push({ x: pxX, y: pxY, w: pxW, h: pxH, type: 'key', taken: false });
            else if (type === 12) tempItems.push({ x: pxX, y: pxY, w: pxW, h: pxH, type: 'star', taken: false });
            else if (type === 7) tempItems.push({ x: pxX, y: pxY, w: pxW, h: pxH, type: 'flag', taken: false });
            else if (type === 8) tempItems.push({ x: pxX, y: pxY, w: pxW, h: pxH, type: 'bulb', taken: false });
            else if (type === 4) tempTriggers.push({ x: pxX, y: pxY, w: pxW, h: pxH, type: 'open', group: group || 'A' });
            else if (type === 5) tempTriggers.push({ x: pxX, y: pxY, w: pxW, h: pxH, type: 'close', group: group || 'A' });
            else if (type === 6) tempTriggers.push({ x: pxX, y: pxY, w: pxW, h: pxH, type: 'door', group: group || 'A', open: false });
            else if (type === 3) tempDecorations.push({ x: pxX, y: pxY, w: pxW, h: pxH, type: 'woman' });
            else if (type === 11) tempEnemies.push({ x: pxX, y: pxY, w: pxW, h: pxH, vx: config.enemySpeedMultiplier * config.tileSize, vy: 0, type: 'H' });
            else if (type === 13) tempEnemies.push({ x: pxX, y: pxY, w: pxW, h: pxH, vx: 0, vy: config.enemySpeedMultiplier * config.tileSize, type: 'V' });
            else if (type === 14) tempEnemies.push({ x: pxX, y: pxY, w: pxW, h: pxH, vx: 0, vy: 0, type: 'S' });
            else if (type === 15) tempEnemies.push({ x: pxX, y: pxY, w: pxW, h: pxH, vx: config.enemySpeedMultiplier * config.tileSize, vy: 0, type: 'X' });
            else if (type === 16) tempItems.push({ x: pxX, y: pxY, w: pxW, h: pxH, type: 'timer', taken: false });
            else if (type === 17) tempEnemies.push(createWisp(pxX, pxY, pxW, pxH));
            else if (type === 18) tempEnemies.push(createWisp(pxX, pxY, pxW, pxH, true));
            for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++) currentMap[r][c] = 0;
        }
    }
    setItems(tempItems); setEnemies(tempEnemies); setTriggers(tempTriggers); setDecorations(tempDecorations); setLavas(tempLavas); setCurrentMap(currentMap);
    prepareLevel();
    updateCamera(true);
    resetHUDCache();
    showOverlay('game-over-overlay', false);
    showOverlay('pause-overlay', false);
    showOverlay('menu-overlay', false);
    if (!gameRunning) { setGameRunning(true); requestAnimationFrame(loop); }
}

/* ===================== VITTORIA, MORTE, FINALE ===================== */

let fadeCallback = null;
let winTimer = 0;

function fadeThen(cb) { fadeCallback = cb; }

function computeScore() {
    const s = gameState.levelStats;
    const time = gameState.levelTime;
    const timeBonus = Math.max(0, 3000 - Math.floor(time) * 5);   // a 10 minuti il bonus finisce
    const power = Math.max(0, gameState.power / gameState.maxPower);
    const score = Math.max(0, timeBonus + s.stars * 100 + s.bulbs * 50 + s.flags * 250 + Math.round(power * 1000) - s.deaths * 500);
    return { score, time, timeBonus, power, ...s };
}

const hooks = {
    onWin() {
        const r = computeScore();
        const prevBest = getBest(currentLevelNumber);
        r.isRecord = !isLab && recordResult(currentLevelNumber, r.score, r.time) && !!prevBest;
        r.best = prevBest ? Math.max(prevBest.score, r.score) : null;
        if (!isLab && currentLevelNumber < camp().count) unlockLevel(currentLevelNumber + 1);
        gameState.lastResult = r;
        winTimer = 6.5;   // secondi di festa + cartellino prima del cambio livello
    },
    onGameOver() {
        releaseKeys();
        const cp = $('btn-checkpoint');
        if (cp) cp.style.display = gameState.checkpoint ? '' : 'none';
        showOverlay('game-over-overlay', true);
    }
};

function afterWin() {
    if (sfx.levelup) { try { sfx.levelup.pause(); sfx.levelup.currentTime = 0; } catch(e) {} }
    if (isLab) { reloadCurrentLevel(); return; }
    if (currentLevelNumber >= camp().count) showFinalScreen();
    else loadLevel(currentLevelNumber + 1);
}

function showFinalScreen() {
    gameState.paused = true;
    stopAllSounds();
    const total = $('final-score');
    if (total) total.textContent = totalBestScore().toLocaleString('en-US');
    const title = $('final-title');
    if (title) title.textContent = getCampaign() === 'vitto' ? 'NEW LEVELS COMPLETE! (FOR NOW)' : 'YOU BEAT ICAROUS!';
    showOverlay('final-overlay', true);
}

/* ===================== PAUSA ===================== */

function togglePause() {
    if (!gameRunning || gameState.won || gameState.gameOver || player.isDying) return;
    if ($('menu-overlay')?.classList.contains('show')) return;
    gameState.paused = !gameState.paused;
    releaseKeys();
    if (gameState.paused) {
        if (sfx.walk) sfx.walk.pause();
        if (sfx.fly) sfx.fly.pause();
        if (sfx.timer) sfx.timer.pause();
        refreshLightButton();
    } else if (timerPowerUp.active && sfx.timer) {
        safePlayAudio(sfx.timer);
    }
    showOverlay('pause-overlay', gameState.paused);
}

function refreshLightButton() {
    const b = $('btn-light');
    if (b) b.textContent = `Dynamic light: ${settings.lighting ? 'ON' : 'OFF'}`;
}

/* ===================== GAME LOOP ===================== */

let lastTime = 0;
let accumulator = 0;
function loop(timestamp) {
    if (!gameRunning) return;
    if (!lastTime) { lastTime = timestamp; requestAnimationFrame(loop); return; }
    let deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (deltaTime > 0.25) deltaTime = 0.25;

    pollGamepad();

    if (!gameState.paused) {
        accumulator += deltaTime;
        while (accumulator >= config.fixedTimeStep) {
            update(config.fixedTimeStep, hooks);
            accumulator -= config.fixedTimeStep;
        }
        updateLowPowerTick(deltaTime);
        if (winTimer > 0) {
            winTimer -= deltaTime;
            if (winTimer <= 0) fadeThen(afterWin);
        }
    } else {
        accumulator = 0;
    }

    // Dissolvenza in nero prima di cambiare livello
    if (fadeCallback) {
        fx.fadeOut = Math.min(1, fx.fadeOut + deltaTime * 2);
        if (fx.fadeOut >= 1) { const cb = fadeCallback; fadeCallback = null; cb(); }
    }

    draw(gameRunning);
    updateHUD(currentLevelNumber, gameRunning);
    updateKeyHUD();
    requestAnimationFrame(loop);
}

/* ===================== MENU INIZIALE ===================== */

let audioReady = false;
async function ensureAudio() {
    const actx = getOrCreateAudioContext();
    if (actx.state === 'suspended') await actx.resume().catch(() => {});
    if (!isLab && window.self === window.top) {
        requestFullscreen();
        setFullscreenActivated(true);
    }
    if (audioReady) return;
    const debugInfo = $('debug-info');
    if (debugInfo) debugInfo.textContent = 'Loading audio...';
    await loadAllAudio((done, total) => { if (debugInfo) debugInfo.textContent = `Audio: ${done}/${total}`; });
    audioReady = true;
    if (debugInfo) debugInfo.textContent = '';
}

async function startFromMenu(levelNumber) {
    await ensureAudio();
    showOverlay('menu-overlay', false);
    showOverlay('final-overlay', false);
    if (isLab) loadLabLevel(); else loadLevel(levelNumber);
}

function buildMenu() {
    const c = camp();
    const unlocked = Math.min(getUnlocked(), c.count);
    document.querySelectorAll('.campaign-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.campaign === getCampaign());
        tab.onclick = () => { setCampaign(tab.dataset.campaign); buildMenu(); };
    });
    $('campaign-desc').textContent = c.desc;
    $('campaign-tag').textContent = c.tag;
    const primary = $('btn-play');
    const newGame = $('btn-new');
    const pick = $('btn-levels');
    const grid = $('level-grid');

    if (isLab) {
        primary.textContent = 'PLAY TEST LEVEL';
        primary.onclick = () => startFromMenu(0);
        newGame.style.display = 'none';
        pick.style.display = 'none';
        $('menu-subtitle').textContent = 'Level lab · G = invincible';
        $('campaign-tabs').style.display = 'none';
        $('campaign-desc').style.display = 'none';
        $('campaign-tag').textContent = 'LAB';
        return;
    }

    primary.textContent = unlocked > 1 ? `CONTINUE · LEVEL ${String(unlocked).padStart(2, '0')}` : 'PLAY';
    primary.onclick = () => startFromMenu(unlocked);
    newGame.style.display = unlocked > 1 ? '' : 'none';
    newGame.onclick = () => startFromMenu(1);
    pick.onclick = () => grid.classList.toggle('show');

    grid.innerHTML = '';
    for (let n = 1; n <= c.count; n++) {
        const b = document.createElement('button');
        b.className = 'level-btn';
        b.disabled = n > unlocked;
        const best = getBest(n);
        b.innerHTML = `<span class="lv-num">${String(n).padStart(2, '0')}</span><span class="lv-best">${best ? best.score.toLocaleString('en-US') : (n > unlocked ? '🔒' : '—')}</span>`;
        b.onclick = () => startFromMenu(n);
        grid.appendChild(b);
    }
    const reset = document.createElement('button');
    reset.className = 'link-btn';
    reset.textContent = 'Reset progress';
    reset.onclick = () => { if (confirm(`Erase unlocked levels and best scores for ${c.name}?`)) { resetProgress(); buildMenu(); grid.classList.add('show'); } };
    grid.appendChild(reset);
}

function showMenu() {
    gameState.paused = true;
    releaseKeys();
    stopAllSounds();
    fadeCallback = null;
    winTimer = 0;
    buildMenu();
    showOverlay('pause-overlay', false);
    showOverlay('game-over-overlay', false);
    showOverlay('final-overlay', false);
    showOverlay('menu-overlay', true);
}

/* ===================== HUD CHIAVE / BANDIERA ===================== */

let hudKey = null, hudFlag = null;
export function updateKeyHUD() {
    if (hudKey !== gameState.hasKey) {
        hudKey = gameState.hasKey;
        const el = document.querySelector('.key-indicator');
        if (el) {
            el.classList.toggle('has-key', hudKey);
            el.innerHTML = `<img src="png/key.png" alt="Key" style="opacity:${hudKey ? 1 : 0.2}">`;
        }
    }
    if (hudFlag !== gameState.hasFlag) {
        hudFlag = gameState.hasFlag;
        const el = document.querySelector('.flag-indicator');
        if (el) {
            el.classList.toggle('has-flag', hudFlag);
            el.title = hudFlag ? 'Checkpoint active' : 'Checkpoint not reached yet';
            el.innerHTML = `<img src="png/flag.png" alt="Checkpoint" style="opacity:${hudFlag ? 1 : 0.2}">`;
        }
    }
}

/* ===================== AVVIO ===================== */

initRenderer(canvas, ctx, sprites);
resizeCanvas();
if (document.fonts) document.fonts.ready.then(measureHud);   // le pillole cambiano misura quando arrivano i font
initInput(getOrCreateAudioContext, {
    onPause: togglePause,
    onGodToggle: () => {
        if (!isLab || !gameRunning) return;
        gameState.god = !gameState.god;
        addFloatText(player.x + player.w / 2, player.y, gameState.god ? 'INVINCIBLE' : 'NORMAL', '#ffffff');
    },
    onKill: () => {
        if (!isLab || !gameRunning || gameState.won) return;
        gameState.god = false;
        gameState.power = 0;
        playerDie();
    }
});
initZoomControls();

$('btn-pause')?.addEventListener('click', togglePause);
$('btn-resume')?.addEventListener('click', togglePause);
$('btn-restart')?.addEventListener('click', () => { showOverlay('pause-overlay', false); reloadCurrentLevel(); });
$('btn-light')?.addEventListener('click', () => { settings.lighting = !settings.lighting; saveSettings(); refreshLightButton(); });
$('btn-pause-menu')?.addEventListener('click', showMenu);
$('btn-checkpoint')?.addEventListener('click', () => {
    showOverlay('game-over-overlay', false);
    if (!respawnAtCheckpoint()) reloadCurrentLevel();
});
$('btn-retry')?.addEventListener('click', () => { showOverlay('game-over-overlay', false); reloadCurrentLevel(); });
$('btn-gameover-menu')?.addEventListener('click', showMenu);
$('btn-final-menu')?.addEventListener('click', showMenu);

// Se la pagina va in background (telefono, cambio scheda) mette in pausa
document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameRunning && !gameState.paused) togglePause();
});

buildMenu();
showOverlay('menu-overlay', true);
