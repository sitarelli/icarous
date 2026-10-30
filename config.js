/* -------------------------------------------------------------------------- */
/* CONFIGURAZIONE E COSTANTI GLOBALI                                          */
/* -------------------------------------------------------------------------- */

// Le due versioni del gioco: stesso motore, livelli diversi.
// Quando aggiungi un livello a una campagna, alza il suo "count".
export const CAMPAIGNS = {
    originale: {
        name: 'CLASSIC',
        tag: '',
        desc: 'The 13 levels rebuilt from the MSX original',
        dir: 'levels',             // levels/level1.js ... level13.js
        count: 13
    },
    vitto: {
        name: 'NEW LEVELS',
        tag: 'NEW LEVELS',
        desc: 'Brand-new levels designed by Vitto and Claude',
        dir: 'levels/vitto',       // levels/vitto/level1.js ...
        count: 7
    }
};

// Modalità laboratorio (test.html → index.html?lab=...): livelli di prova, niente salvataggi
const urlParams = new URLSearchParams(location.search);
export const labSource = urlParams.get('lab');   // null in gioco normale
export const isLab = labSource !== null;

// Rilevazione mobile migliorata (controlla user agent E touch support E dimensioni)
function detectMobile() {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Usa screen.width/height (dimensioni fisiche del display in CSS px)
    // Su Samsung S23: screen.width=360 o screen.height=780 indipendente dall'orientamento
    // Evita window.innerWidth che cambia con l'orientamento e può superare 1024 in landscape
    const screenShortSide = Math.min(screen.width, screen.height);
    const isSmallScreen = screenShortSide <= 500;

    // Mobile se: (UA mobile O touch disponibile) E schermo fisicamente piccolo
    return (isMobileUA || hasTouch) && isSmallScreen;
}

export const isMobile = detectMobile();

// La tela occupa tutta la finestra: le misure (px CSS) si aggiornano a ogni ridimensionamento (main.js → resizeCanvas)
const viewportWidth = window.innerWidth || 1000;
const viewportHeight = window.innerHeight || 580;

export const config = {
    viewportWidth,
    viewportHeight,
    baseGravity: 0.45,
    baseSpeed: 15.0,
    baseThrust: -0.80,
    maxFallSpeed: 4.6,
    maxFlySpeed: -0.36,
    enemySpeedMultiplier: 0.20,
    zoom: isMobile ? 1.5 : 1,  // ricalcolato da applyZoom() in main.js
    userZoom: 1,               // moltiplicatore scelto coi pulsanti + / −
    safeLeft: 0,               // margine del notch a sinistra (px CSS), letto dal CSS
    hudBottom: 60,             // fondo delle pillole dell'HUD (px CSS): il radar sta lì sotto
    tileSize: 0,
    hitboxMargin: 0.25,
    fixedTimeStep: 1/60
};

// Impostazioni dell'utente (sovrascritte da save.js all'avvio)
export const settings = {
    lighting: true   // Luce dinamica (grotta buia + alone attorno a Icarous)
};

// Stato dei tasti/input (condiviso tra input.js e player.js)
export const keys = {
    right: false,
    left: false,
    up: false
};

// Stato del gioco
export const gameState = {
    power: 1.0,
    maxPower: 1.0,
    hasKey: false,
    hasFlag: false,
    doorOpen: false,
    gameOver: false,
    won: false,
    paused: true,       // true finché si è nel menu
    god: false,         // invincibilità (solo laboratorio, tasto G)
    stars: 0,
    flags: 0,
    bulbs: 0,
    statusMessage: "Loading...",
    victoryTime: 0,
    checkpoint: null,   // { x, y, power } salvato toccando la bandiera
    levelTime: 0,       // secondi trascorsi nel livello
    levelStats: { stars: 0, bulbs: 0, flags: 0, deaths: 0 },
    lastResult: null    // punteggio dell'ultimo livello completato
};

// Player entity
export const player = {
    x: 0, y: 0, w: 0, h: 0, vx: 0, vy: 0, startX: 0, startY: 0,
    frameIndex: 0,
    frameTimer: 0,
    facing: 1,
    animState: 0,
    damageCooldown: 0,
    canFly: true,
    bumped: false,     // ha sbattuto la testa: niente volo finché non atterra
    squash: 0,         // schiacciamento visivo dopo la botta (secondi)
    isDying: false,
    deathFrame: 0,
    deathMode: '',     // 'melt' (muore a terra: si scioglie) · 'fall' (muore in volo: precipita) · 'crumble' (si sbriciola)
    deathTime: 0,      // secondi dall'inizio della fase di morte
    deathRot: 0,       // rotazione del corpo mentre precipita
    puddle: 0,         // mezza larghezza della pozza di cera (px del mondo)
    isInLava: false
};

// Power-up timer (stile Pac-Man): nemici congelati per 10 secondi
export const timerPowerUp = { active: false, timeLeft: 0 };

// Camera
export const camera = { x: 0, y: 0 };

// Effetti globali (hit-stop, lampo bianco, luce extra dalle lampadine, scritte volanti)
export const fx = {
    hitStop: 0,
    flash: 0,
    lightBoost: 0,
    floatTexts: [],
    fadeIn: 0,        // 1 = nero pieno, scende a 0 all'inizio del livello
    fadeOut: 0,       // sale a 1 prima di cambiare livello
    titleTime: 0      // secondi dal caricamento (per il cartello del titolo)
};

// Variabili di gioco condivise
export let currentLevelNumber = 1;
export let gameRunning = false;
export let currentMap = [];
export let items = [];
export let enemies = [];
export let triggers = [];
export let decorations = [];
export let lavas = [];
export const lavaParticles = [];
export const dustParticles = [];
export const fireworkParticles = [];
export const colorParticles = [];
export const featherParticles = [];
export const deathParticles = [];   // gocce di cera, vapore, braci, frammenti e polvere della morte
export const lavaAnimTime = { value: 0 };
export const cameraShake = { x: 0, y: 0, intensity: 0 };

// Funzioni setter per le variabili che devono essere modificabili
export function setCurrentLevelNumber(num) { currentLevelNumber = num; }
export function setGameRunning(value) { gameRunning = value; }
export function setCurrentMap(map) { currentMap = map; }
export function setItems(arr) { items = arr; }
export function setEnemies(arr) { enemies = arr; }
export function setTriggers(arr) { triggers = arr; }
export function setDecorations(arr) { decorations = arr; }
export function setLavas(arr) { lavas = arr; }

export function clearParticles() {
    lavaParticles.length = 0;
    dustParticles.length = 0;
    fireworkParticles.length = 0;
    colorParticles.length = 0;
    featherParticles.length = 0;
    deathParticles.length = 0;
    fx.floatTexts.length = 0;
}
