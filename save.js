/* -------------------------------------------------------------------------- */
/* SALVATAGGIO PROGRESSI E RECORD (localStorage del browser)                  */
/* -------------------------------------------------------------------------- */
// I dati restano nel browser del dispositivo: funziona anche su Vercel/GitHub Pages.
// Una classifica condivisa tra giocatori richiederebbe invece un database (es. Supabase).

import { settings, isLab } from './config.js';

const SAVE_KEY = 'icarous_save_v1';

// Ogni campagna ha i suoi progressi: { [campagna]: { unlocked, best: { [livello]: { score, time } } } }
const data = {
    campaign: 'vitto',   // al primo avvio si apre NEW LEVELS
    campaigns: {},
    settings: {}
};

function read() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            // Salvataggi vecchi (una sola campagna): diventano quelli dell'Originale
            if (saved.unlocked && !saved.campaigns) {
                saved.campaigns = { originale: { unlocked: saved.unlocked, best: saved.best || {} } };
            }
            Object.assign(data, { campaign: saved.campaign || 'vitto', campaigns: saved.campaigns || {}, settings: saved.settings || {} });
        }
    } catch (e) { /* storage non disponibile: si gioca senza salvataggi */ }
    Object.assign(settings, data.settings || {});
}

function write() {
    if (isLab) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {}
}

read();

function slot() {
    if (!data.campaigns[data.campaign]) data.campaigns[data.campaign] = { unlocked: 1, best: {} };
    return data.campaigns[data.campaign];
}

export function getCampaign() { return data.campaign; }
export function setCampaign(id) { data.campaign = id; write(); }

export function getUnlocked() { return slot().unlocked; }
export function getBest(level) { return slot().best[level] || null; }

export function unlockLevel(level) {
    const s = slot();
    if (level > s.unlocked) { s.unlocked = level; write(); }
}

// Registra il risultato: ritorna true se è un nuovo record di punteggio
export function recordResult(level, score, time) {
    if (isLab) return false;
    const s = slot();
    const prev = s.best[level];
    const isRecord = !prev || score > prev.score;
    s.best[level] = {
        score: isRecord ? score : prev.score,
        time: prev ? Math.min(prev.time, time) : time
    };
    write();
    return isRecord;
}

export function totalBestScore() {
    return Object.values(slot().best).reduce((s, b) => s + (b.score || 0), 0);
}

export function saveSettings() {
    data.settings = { ...settings };
    write();
}

export function resetProgress() {
    data.campaigns[data.campaign] = { unlocked: 1, best: {} };
    write();
}
