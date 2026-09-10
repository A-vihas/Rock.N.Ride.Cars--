import { SPAWN } from './config.js';

export const P = {
  x: SPAWN.x, z: SPAWN.z, y: 0, heading: SPAWN.heading,
  speed: 0, vy: 0,
  airborne: false, airTime: 0, bestAir: 0,
  nitro: 100, gear: 1, score: 0, coins: 0, cpIndex: 0,
  hudAt: 0, clockAt: 0,
  carClass: 'm5', swapCooldown: 0,
};

export const keys = {};

export const game = {
  started: false,
  paused: false,
  camMode: 0,
  timeOfDay: 12.5,
  selectedPreset: null,
  selectedCarClass: 'm5',
  playerColor: 0xff3b30,
};

export function setPaused(v) {
  game.paused = v;
  const b = document.getElementById('pauseBtn');
  if (b) b.textContent = v ? '▶' : 'Ⅱ';
}

export function cycleCam() {
  game.camMode = (game.camMode + 1) % 3;
  return game.camMode;
}
