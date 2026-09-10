export const save = { coins: 0 };   // filled in main.js
export let selectedPreset = null;
export let selectedCarClass = 'm5';
export let playerColor = 0xff3b30;
export let started = false;
export let paused = false;
export let camMode = 0;
export let timeOfDay = 12.5;

export function setSelectedPreset(p)   { selectedPreset = p; }
export function setSelectedCarClass(c) { selectedCarClass = c; }
export function setPlayerColor(c)      { playerColor = c; }
export function setStarted(v)          { started = v; }
export function setPaused(v)           { paused = v; }
export function setCamMode(v)          { camMode = v; }
export function setTimeOfDay(v)        { timeOfDay = v; }

export function cycleCam() { camMode = (camMode + 1) % 3; return camMode; }

// Player physics state (mutable)
export const P = {
  x: 132, z: 132, y: 0, heading: -Math.PI / 2,
  speed: 0, vy: 0,
  airborne: false, airTime: 0, bestAir: 0,
  nitro: 100, gear: 1, score: 0, coins: 0, cpIndex: 0,
  hudAt: 0, clockAt: 0,
  carClass: 'm5', swapCooldown: 0,
};

export const keys = {};

// Modules get set by main.js
export const refs = {
  scene: null, camera: null, renderer: null,
  player: null,
  sun: null, moon: null, hemi: null, amb: null,
  skyUniforms: null,
  windowMats: [], signMats: [], lampMats: [],
  lampGlow: null,
  trafficCars: [], hwyTraffic: [], parkedCars: [], coinPickups: [],
  checkpoints: [],
};