import { keys, cycleCam, setPaused, started, paused } from './state.js';

export function setupInput() {
  const blockKeys = ['w','a','s','d',' ','arrowup','arrowdown','arrowleft','arrowright','shift'];
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (blockKeys.includes(k)) e.preventDefault();
    if (k === 'c') cycleCam();
    if (k === 'escape' && started) setPaused(!paused);
  });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  function bindTouch(el, key) {
    const on = e => { e.preventDefault(); keys[key] = true; };
    const off = e => { e.preventDefault(); keys[key] = false; };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('pointerleave', off);
  }
  document.querySelectorAll('[data-key]').forEach(el => bindTouch(el, el.dataset.key));
}
