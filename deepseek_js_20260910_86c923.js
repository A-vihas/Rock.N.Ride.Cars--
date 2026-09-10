import * as THREE from 'three';
import { SPAWN, HWY_Y, HWY_W, HWY_HALF, STREET_WIDTH, STREETS, TIME_PRESETS, SECONDS_PER_HOUR } from './config.js';
import { loadSave, saveGame } from './save.js';
import { P, keys, refs, setPaused, setStarted, setCamMode, cycleCam, setPlayerColor, setSelectedPreset, setSelectedCarClass, setTimeOfDay } from './state.js';
import { buildWorld, buildCheckpoints } from './world.js';
import { makeCar } from './cars.js';
import { updatePlayer } from './physics.js';
import { updateTraffic, updateCoins, respawnVehicle, randomClassId, randomColor } from './traffic.js';
import { setupInput } from './input.js';
import { updateCamera } from './camera.js';
import { applyTimeOfDay, advanceTime } from './timeOfDay.js';
import { updateHud, showAirPop, showSwapHint } from './hud.js';
import { renderTimeTiles, renderCarTiles, updateStartButton, setupPaintRow } from './ui.js';

// ---------------- Bootstrap ----------------
const save = loadSave();
let selectedPreset = TIME_PRESETS[0];
let selectedCarClass = 'm5';
let playerColor = 0xff3b30;
let started = false;
let paused = false;
let camMode = 0;
let timeOfDay = selectedPreset.hour;

// ---------------- Three.js setup ----------------
const canvasEl = document.getElementById('canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 1600);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
canvasEl.appendChild(renderer.domElement);

refs.scene = scene;
refs.camera = camera;
refs.renderer = renderer;

// Sky
const skyUniforms = {
  topColor:    { value: new THREE.Color(0x3a8ee8) },
  midColor:    { value: new THREE.Color(0x80b8e8) },
  bottomColor: { value: new THREE.Color(0xc0e0ff) },
  sunPos:      { value: new THREE.Vector3(0, 1, 0) },
  sunColor:    { value: new THREE.Color(0xffffff) },
};
refs.skyUniforms = skyUniforms;
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUniforms,
  vertexShader: `
    varying vec3 vWorldDir;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldDir = normalize(wp.xyz - cameraPosition);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform vec3 topColor; uniform vec3 midColor; uniform vec3 bottomColor;
    uniform vec3 sunColor; uniform vec3 sunPos;
    varying vec3 vWorldDir;
    void main() {
      vec3 dir = normalize(vWorldDir);
      float h = dir.y;
      vec3 col = mix(bottomColor, midColor, smoothstep(-0.02, 0.3, h));
      col = mix(col, topColor, smoothstep(0.2, 0.85, h));
      float sd = dot(dir, normalize(sunPos));
      col += sunColor * pow(max(sd, 0.0), 400.0) * 3.0;
      col += sunColor * pow(max(sd, 0.0), 6.0) * 0.25;
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), skyMat);
skyMesh.frustumCulled = false;
scene.add(skyMesh);
scene.fog = new THREE.FogExp2(0xa8c8e0, 0.0018);

// Lights
const hemi = new THREE.HemisphereLight(0x88bbee, 0x2a2a30, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -400, right: 400, top: 400, bottom: -400, near: 1, far: 1000 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const amb = new THREE.AmbientLight(0x3a4560, 0.4);
scene.add(amb);
const moon = new THREE.DirectionalLight(0x9ab8ff, 0.0);
scene.add(moon, moon.target);

refs.sun = sun; refs.moon = moon; refs.hemi = hemi; refs.amb = amb;

// World
buildWorld(scene);
const checkpoints = buildCheckpoints(scene);
window.__rockCheckpoints = checkpoints;
refs.checkpoints = checkpoints;

// Player
let player = makeCar(selectedCarClass, playerColor, { headlight: true });
player.position.set(P.x, P.y, P.z);
player.rotation.y = P.heading;
scene.add(player);
refs.player = player;

// Traffic
const trafficCars = [];
for (let i = 0; i < 44; i++) {
  const axis = Math.random() < 0.5 ? 'x' : 'z';
  const street = STREETS[Math.floor(Math.random() * STREETS.length)];
  const dir = Math.random() < 0.5 ? 1 : -1;
  const lane = dir * (STREET_WIDTH / 4);
  const c = makeCar(randomClassId(), randomColor());
  scene.add(c);
  trafficCars.push({
    type: 'traffic', mesh: c, axis, street, dir, lane,
    pos: (Math.random() * 2 - 1) * 240,
    speed: 14 + Math.random() * 10,
    taken: false, respawnAt: 0,
  });
}
refs.trafficCars = trafficCars;

const hwyTraffic = [];
for (let i = 0; i < 20; i++) {
  const axis = Math.random() < 0.5 ? 'x' : 'z';
  const side = Math.random() < 0.5 ? -1 : 1;
  const dir = Math.random() < 0.5 ? 1 : -1;
  const off = dir * (HWY_W / 6);
  const c = makeCar(randomClassId(), randomColor());
  scene.add(c);
  hwyTraffic.push({
    type: 'hwy', mesh: c, axis, side, dir, off,
    pos: (Math.random() * 2 - 1) * 240,
    speed: 26 + Math.random() * 12,
    taken: false, respawnAt: 0,
  });
}
refs.hwyTraffic = hwyTraffic;

const parkedCars = [];
for (const s of STREETS) {
  for (let p = -240; p <= 240; p += 24) {
    if (Math.abs(Math.abs(p) - Math.abs(s)) < 30) continue;
    if (Math.random() < 0.42) {
      const c = makeCar(randomClassId(), randomColor());
      c.position.set(s + STREET_WIDTH/2 - 2.5, 0.3, p);
      c.rotation.y = Math.PI;
      scene.add(c);
      parkedCars.push({ type: 'parked', mesh: c, taken: false, respawnAt: 0, x: c.position.x, z: c.position.z, rot: c.rotation.y });
    }
    if (Math.random() < 0.42) {
      const c = makeCar(randomClassId(), randomColor());
      c.position.set(p, 0.3, s - STREET_WIDTH/2 + 2.5);
      c.rotation.y = Math.PI/2;
      scene.add(c);
      parkedCars.push({ type: 'parked', mesh: c, taken: false, respawnAt: 0, x: c.position.x, z: c.position.z, rot: c.rotation.y });
    }
  }
}
refs.parkedCars = parkedCars;

// Coins
const coinGeo = new THREE.TorusGeometry(0.7, 0.22, 8, 20);
const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0xffb020, emissiveIntensity: 1.4, metalness: 0.9, roughness: 0.2 });
const coinPickups = [];
for (let i = 0; i < 70; i++) {
  const x = (Math.random() * 2 - 1) * 260, z = (Math.random() * 2 - 1) * 260;
  const m = new THREE.Mesh(coinGeo, coinMat);
  m.position.set(x, 1.5, z); m.rotation.x = Math.PI / 2;
  scene.add(m);
  coinPickups.push({ mesh: m, x, z, spin: Math.random() * Math.PI * 2, taken: false, respawnAt: 0 });
}
for (let i = 0; i < 40; i++) {
  const axis = Math.random() < 0.5 ? 'x' : 'z';
  const side = Math.random() < 0.5 ? -1 : 1;
  const p = (Math.random() * 2 - 1) * 240;
  let x, z;
  if (axis === 'x') { x = p; z = side * HWY_HALF; }
  else { x = side * HWY_HALF; z = p; }
  const m = new THREE.Mesh(coinGeo, coinMat);
  m.position.set(x, HWY_Y + 1.5, z); m.rotation.x = Math.PI / 2;
  scene.add(m);
  coinPickups.push({ mesh: m, x, z, y: HWY_Y + 1.5, spin: Math.random() * Math.PI * 2, taken: false, respawnAt: 0 });
}
refs.coinPickups = coinPickups;

// ---------------- UI wiring ----------------
const $ = id => document.getElementById(id);
$('coinCount').textContent = Math.floor(save.coins).toLocaleString();

function refreshUI() {
  renderTimeTiles(save, selectedPreset, p => { selectedPreset = p; refreshUI(); });
  renderCarTiles(save, selectedCarClass, c => { selectedCarClass = c; refreshUI(); });
  updateStartButton(save, selectedPreset, selectedCarClass);
}
refreshUI();

setupPaintRow(color => {
  playerColor = color;
  if (player.userData.bodyMaterial) player.userData.bodyMaterial.color.setHex(color);
});

// Take-over
function tryTakeOver(target) {
  if (P.swapCooldown > 0) return;
  const clsId = target.mesh.userData.classId || 'm5';
  const cls = getCarClassFromList(clsId);
  const owned = Math.floor(save.coins + P.coins);
  if (owned < cls.cost) {
    showSwapHint(`NEED ${cls.cost}¢ FOR ${cls.name} — HAVE ${owned}¢`, true);
    P.swapCooldown = 0.8;
    return;
  }
  let cost = cls.cost;
  if (P.coins >= cost) P.coins -= cost;
  else {
    cost -= P.coins;
    P.coins = 0;
    save.coins -= cost;
    if (save.coins < 0) save.coins = 0;
    saveGame(save);
    $('coinCount').textContent = Math.floor(save.coins + P.coins).toLocaleString();
  }
  const targetPos = target.mesh.position.clone();
  const targetRotY = target.mesh.rotation.y;
  scene.remove(target.mesh);
  target.taken = true;
  target.respawnAt = performance.now() + 6000;
  scene.remove(player);
  player = makeCar(clsId, playerColor, { headlight: true });
  player.position.set(targetPos.x, P.y, targetPos.z);
  scene.add(player);
  refs.player = player;
  P.carClass = clsId;
  P.heading = targetRotY;
  P.speed *= 0.6;
  P.swapCooldown = 2.0;
  $('carClassEl').textContent = cls.name;
  showSwapHint(`SHIFTED INTO ${cls.name}  −${cls.cost}¢`);
}

function getCarClassFromList(id) {
  // local helper to avoid another import cycle
  const list = [
    { id:'m5', name:'BMW M5', cost:0 },
    { id:'m4', name:'BMW M4', cost:80 },
    { id:'muscle', name:'CHALLENGER', cost:180 },
    { id:'suv', name:'G-CLASS', cost:250 },
    { id:'lambo', name:'LAMBORGHINI', cost:500 },
    { id:'jesko', name:'KOENIGSEGG JESKO', cost:1500 },
  ];
  return list.find(c => c.id === id) || list[0];
}

// ---------------- Start button ----------------
$('startBtn').addEventListener('click', () => {
  const carObj = getCarClassFromList(selectedCarClass);
  const total = selectedPreset.cost + carObj.cost;
  if (total > 0) {
    if (save.coins < total) return;
    save.coins -= total;
    saveGame(save);
    $('coinCount').textContent = Math.floor(save.coins).toLocaleString();
  }
  timeOfDay = selectedPreset.hour;
  scene.remove(player);
  P.carClass = selectedCarClass;
  player = makeCar(selectedCarClass, playerColor, { headlight: true });
  player.position.set(P.x, P.y, P.z);
  player.rotation.y = P.heading;
  scene.add(player);
  refs.player = player;
  $('carClassEl').textContent = carObj.name;

  started = true;
  paused = false;
  $('pauseBtn').textContent = 'Ⅱ';
  $('menu').style.display = 'none';
  $('hud').style.display = '';
  $('info').style.display = '';
  $('clock').style.display = '';
  if (matchMedia('(pointer: coarse)').matches) {
    $('p1Ctl').style.display = 'flex';
    $('pedalCtl').style.display = 'flex';
  }
  last = performance.now();
});

// Pause
$('pauseBtn').addEventListener('click', () => {
  if (!started) return;
  if (!paused) {
    save.coins += P.coins;
    saveGame(save);
    $('coinCount').textContent = Math.floor(save.coins).toLocaleString();
  }
  paused = !paused;
  $('pauseBtn').textContent = paused ? '▶' : 'Ⅱ';
});

$('fsBtn').addEventListener('click', () => document.documentElement.requestFullscreen?.());

// Auto-bank coins every 8s
setInterval(() => {
  if (started && !paused && P.coins > 0) {
    save.coins += P.coins;
    P.coins = 0;
    saveGame(save);
    $('coinCount').textContent = Math.floor(save.coins).toLocaleString();
  }
}, 8000);

// Input
setupInput();

// ---------------- Main loop ----------------
let last = performance.now();

function loop(now) {
  const dt = Math.min(0.034, (now - last) / 1000);
  last = now;

  if (started && !paused) {
    updatePlayer(dt, player, {
      onAir: (airTime) => {
        const reward = Math.round(airTime * 900 + P.bestAir * 40);
        P.score += reward;
        P.coins += Math.round(reward / 40);
        if (airTime > P.bestAir) P.bestAir = airTime;
        showAirPop(`+${reward} AIR (${airTime.toFixed(2)}s)  +${Math.round(reward/40)}¢`);
      },
      trafficCars, hwyTraffic, parkedCars, coinPickups, checkpoints,
      onTakeOver: tryTakeOver,
    });
    timeOfDay = advanceTime(dt);
  }
  updateTraffic(dt, trafficCars, hwyTraffic);
  updateCoins(now, coinPickups);
  updateCamera(dt, camera, camMode);
  updateHud(now, timeOfDay, checkpoints, save.coins + P.coins);
  applyTimeOfDay(timeOfDay);

  // Sun follow
  const sx = sun.position.x, sy = sun.position.y, sz = sun.position.z;
  sun.target.position.set(P.x, 0, P.z);
  sun.position.set(P.x + sx * 0.6, sy, P.z + sz * 0.6);
  sun.target.updateMatrixWorld();

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Resize
function resize() {
  const w = canvasEl.clientWidth, h = canvasEl.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();

// Cycle camera on C — hook it via a small watcher
let lastC = false;
setInterval(() => {
  const c = keys['c'];
  if (c && !lastC) camMode = (camMode + 1) % 3;
  lastC = c;
}, 50);