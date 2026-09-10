import { SAVE_KEY } from './config.js';

export function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || { coins: 0 }; }
  catch { return { coins: 0 }; }
}

export function saveGame(s) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch {}
}