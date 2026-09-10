import * as THREE from 'three';
import {
  WORLD_HALF, HWY_Y, HWY_W, HWY_HALF, STREETS, STREET_WIDTH,
  BLOCK_SIZE, SIDEWALK, BLOCK_CENTERS, PARK_BLOCKS,
  SECONDS_PER_HOUR, SPAWN, PLATFORMS, RAMPS,
  CAR_CLASSES, getCarClass, TIME_PRESETS, TRAFFIC_COLORS,
} from './config.js';
import { loadSave, saveGame } from './save.js';
import { P, keys, game, setPaused, cycleCam } from './state.js';

const $ = id => document.getElementById(id);
const save = loadSave();
let selectedPreset = TIME_PRESETS[0];
let selectedCarClass = 'm5';
let playerColor = 0xff3b30;

// ==================== THREE SETUP ====================
const canvasEl = $('canvas');
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

const skyUniforms = {
  topColor:    { value: new THREE.Color(0x3a8ee8) },
  midColor:    { value: new THREE.Color(0x80b8e8) },
  bottomColor: { value: new THREE.Color(0xc0e0ff) },
  sunPos:      { value: new THREE.Vector3(0, 1, 0) },
  sunColor:    { value: new THREE.Color(0xffffff) },
};
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUniforms,
  vertexShader: `varying vec3 vWorldDir;void main(){vec4 wp=modelMatrix*vec4(position,1.0);vWorldDir=normalize(wp.xyz-cameraPosition);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader: `uniform vec3 topColor;uniform vec3 midColor;uniform vec3 bottomColor;uniform vec3 sunColor;uniform vec3 sunPos;varying vec3 vWorldDir;void main(){vec3 dir=normalize(vWorldDir);float h=dir.y;vec3 col=mix(bottomColor,midColor,smoothstep(-0.02,0.3,h));col=mix(col,topColor,smoothstep(0.2,0.85,h));float sd=dot(dir,normalize(sunPos));col+=sunColor*pow(max(sd,0.0),400.0)*3.0;col+=sunColor*pow(max(sd,0.0),6.0)*0.25;gl_FragColor=vec4(col,1.0);}`
});
const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), skyMat);
skyMesh.frustumCulled = false;
scene.add(skyMesh);
scene.fog = new THREE.FogExp2(0xa8c8e0, 0.0018);

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

// ==================== TEXTURES ====================
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function makeAsphaltTex() {
  const c = cnv(512, 512), x = c.getContext('2d');
  x.fillStyle = '#17171b'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 20000; i++) {
    const v = (Math.random() - 0.5) * 34;
    x.fillStyle = `rgb(${23+v|0},${23+v|0},${26+v|0})`;
    x.fillRect(Math.random()*512|0, Math.random()*512|0, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function makeSidewalkTex() {
  const c = cnv(256, 256), x = c.getContext('2d');
  x.fillStyle = '#8a8a92'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) {
    const v = (Math.random() - 0.5) * 30;
    x.fillStyle = `rgba(${138+v},${138+v},${146+v},0.4)`;
    x.fillRect(Math.random()*256|0, Math.random()*256|0, 1, 1);
  }
  x.strokeStyle = 'rgba(60,60,70,0.85)'; x.lineWidth = 3;
  for (let i = 0; i <= 256; i += 32) {
    x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke();
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function makeGlassTex(w = 512, h = 1024) {
  const c = cnv(w, h), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0,'#2e4668'); g.addColorStop(.3,'#1c2e4a');
  g.addColorStop(.6,'#141e32'); g.addColorStop(1,'#0a1220');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'lighter';
  for (let i = -4; i < 14; i++) {
    x.save(); x.translate(i*70, 0); x.rotate(-0.48);
    const g2 = x.createLinearGradient(0, 0, 26, 0);
    g2.addColorStop(0,'rgba(140,190,240,0)');
    g2.addColorStop(.5,'rgba(140,190,240,0.13)');
    g2.addColorStop(1,'rgba(140,190,240,0)');
    x.fillStyle = g2; x.fillRect(0, -h, 26, h*2); x.restore();
  }
  x.globalCompositeOperation = 'source-over';
  const cw = 20, rh = 28;
  for (let py = 0; py < h; py += rh) {
    x.fillStyle = 'rgba(0,0,0,0.75)'; x.fillRect(0, py, w, 3);
    x.fillStyle = 'rgba(180,200,240,0.13)'; x.fillRect(0, py+3, w, 1);
  }
  for (let px = 0; px < w; px += cw) {
    x.fillStyle = 'rgba(0,0,0,0.65)'; x.fillRect(px, 0, 2, h);
  }
  for (let py = 0; py < h; py += rh) for (let px = 0; px < w; px += cw) {
    if (Math.random() < .32) {
      const warm = Math.random() < .55;
      const a = .35 + Math.random()*.42;
      x.fillStyle = warm ? `rgba(255,215,155,${a})` : `rgba(160,205,255,${a})`;
      x.fillRect(px+3, py+5, cw-5, rh-9);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function makeOfficeTex(w = 512, h = 512) {
  const c = cnv(w, h), x = c.getContext('2d');
  x.fillStyle = '#1c1e2a'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 10000; i++) {
    const v = Math.random()*22;
    x.fillStyle = `rgba(${90+v|0},${100+v|0},${125+v|0},0.08)`;
    x.fillRect(Math.random()*w|0, Math.random()*h|0, 1, 1);
  }
  const cw = 34, rh = 30;
  for (let py = 0; py < h; py += rh) {
    x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(0, py, w, 3);
    for (let px = 0; px < w; px += cw) {
      x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(px, py, 3, rh);
      if (Math.random() < .4) {
        const warm = Math.random() < .72;
        const a = .55 + Math.random()*.42;
        x.fillStyle = warm ? `rgba(255,220,155,${a})` : `rgba(160,210,255,${a})`;
      } else {
        x.fillStyle = 'rgba(14,20,32,0.95)';
      }
      x.fillRect(px+4, py+5, cw-6, rh-10);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function makeResiTex(w = 512, h = 512) {
  const c = cnv(w, h), x = c.getContext('2d');
  x.fillStyle = '#3a2420'; x.fillRect(0, 0, w, h);
  const cw = 34, rh = 38;
  for (let py = 0; py < h; py += rh) {
    x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, py, w, 3);
    for (let px = 0; px < w; px += cw) {
      if (Math.random() < .5) {
        const warm = Math.random() < .85;
        const a = .55 + Math.random()*.42;
        x.fillStyle = warm ? `rgba(255,205,145,${a})` : `rgba(180,215,255,${a})`;
      } else {
        x.fillStyle = 'rgba(20,14,12,0.9)';
      }
      x.fillRect(px+4, py+6, cw-8, rh-16);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function makeStoreTex(w = 1024, h = 256) {
  const c = cnv(w, h), x = c.getContext('2d');
  x.fillStyle = '#0a0810'; x.fillRect(0, 0, w, h);
  const cols = ['#ff4d8a','#4dcaff','#ffd24d','#8aff9c','#ff8a4d','#c8a0ff','#4dff88','#ff5c4d'];
  const bw = 128;
  for (let i = 0; i < w; i += bw) {
    const col = cols[(i/bw|0) % cols.length];
    for (let s = 0; s < 6; s++) {
      x.fillStyle = s % 2 === 0 ? col : '#f0f0f0';
      x.fillRect(i+6+s*((bw-12)/6), 0, (bw-12)/6, 42);
    }
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(i+6, 42, bw-12, 4);
    x.fillStyle = 'rgba(30,40,60,0.85)'; x.fillRect(i+10, 50, bw-20, h-70);
    const grd = x.createLinearGradient(0, 50, 0, h-20);
    grd.addColorStop(0,'rgba(255,220,160,0.35)');
    grd.addColorStop(1,'rgba(255,200,120,0.6)');
    x.fillStyle = grd; x.fillRect(i+10, 50, bw-20, h-70);
    x.fillStyle = col; x.fillRect(i+14, 46, bw-28, 4);
    x.strokeStyle = 'rgba(0,0,0,0.9)'; x.lineWidth = 3;
    x.strokeRect(i+6, 0, bw-12, h);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function makeBillboardTex(text, hue) {
  const c = cnv(512, 256), x = c.getContext('2d');
  x.fillStyle = '#050810'; x.fillRect(0, 0, 512, 256);
  x.fillStyle = `hsl(${hue},90%,55%)`; x.fillRect(10, 10, 492, 236);
  x.fillStyle = '#050810'; x.fillRect(22, 22, 468, 212);
  x.fillStyle = `hsl(${hue},100%,70%)`;
  x.font = 'bold 96px Arial';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 256, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const WINDOW_MATS = [], SIGN_MATS = [], LAMP_MATS = [];
let LAMP_GLOW = null;

// ==================== WORLD ====================
const groundTex = makeAsphaltTex(); groundTex.repeat.set(70, 70);
{
  const g = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_HALF*2.6, WORLD_HALF*2.6),
    new THREE.MeshStandardMaterial({ color: 0x2a2a30, map: groundTex, roughness: 0.96 })
  );
  g.rotation.x = -Math.PI/2; g.receiveShadow = true; scene.add(g);
}
const ASPHALT_TEX = makeAsphaltTex(); ASPHALT_TEX.repeat.set(2, 20);
const SIDEWALK_TEX = makeSidewalkTex(); SIDEWALK_TEX.repeat.set(8, 8);
const GLASS_TEX = makeGlassTex();
const OFFICE_TEX = makeOfficeTex();
const RESI_TEX = makeResiTex();
const STORE_TEX = makeStoreTex();

const streetLen = (STREETS[STREETS.length-1] - STREETS[0]) + STREET_WIDTH + 240;
const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x232326, map: ASPHALT_TEX, roughness: 0.9 });
for (const s of STREETS) {
  const a = new THREE.Mesh(new THREE.PlaneGeometry(STREET_WIDTH, streetLen), asphaltMat);
  a.rotation.x = -Math.PI/2; a.position.set(s, 0.02, 0); a.receiveShadow = true; scene.add(a);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(streetLen, STREET_WIDTH), asphaltMat);
  b.rotation.x = -Math.PI/2; b.position.set(0, 0.02, s); b.receiveShadow = true; scene.add(b);
}
const lineY = new THREE.MeshBasicMaterial({ color: 0xffcc22 });
const lineW = new THREE.MeshBasicMaterial({ color: 0xdddddd });
function addLine(x, z, w, h, m = lineY) {
  const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  o.rotation.x = -Math.PI/2; o.position.set(x, 0.035, z); scene.add(o);
}
for (const s of STREETS) {
  addLine(s-0.5, 0, 0.35, streetLen); addLine(s+0.5, 0, 0.35, streetLen);
  addLine(0, s-0.5, streetLen, 0.35); addLine(0, s+0.5, streetLen, 0.35);
  for (let p = -260; p <= 260; p += 16) {
    addLine(s-STREET_WIDTH/4, p, 0.4, 6, lineW); addLine(s+STREET_WIDTH/4, p, 0.4, 6, lineW);
    addLine(p, s-STREET_WIDTH/4, 6, 0.4, lineW); addLine(p, s+STREET_WIDTH/4, 6, 0.4, lineW);
  }
}
const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x909098, map: SIDEWALK_TEX, roughness: 0.95 });
for (const bx of BLOCK_CENTERS) for (const bz of BLOCK_CENTERS) {
  const w = BLOCK_SIZE + SIDEWALK*2;
  const walk = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, w), sidewalkMat);
  walk.position.set(bx, 0.15, bz); walk.receiveShadow = true; scene.add(walk);
}

// Buildings
const ROOF_MAT = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.9 });
const ANTENNA_MAT = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.4 });
const AC_MAT = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.7, metalness: 0.3 });
const DARK_MAT = new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.9 });
const BEACON_MAT = new THREE.MeshBasicMaterial({ color: 0xff2222 });
let seed = 9137;
const rnd = () => (seed = (seed*9301+49297) % 233280) / 233280;

function makeClonedTex(base, rx, ry) {
  const t = base.clone();
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(Math.max(1, rx), Math.max(1, ry));
  return t;
}
function matFromTex(tex, rx, ry, opts = {}) {
  const t = makeClonedTex(tex, rx, ry);
  const m = new THREE.MeshStandardMaterial({
    map: t,
    emissive: 0xffffff,
    emissiveMap: t,
    emissiveIntensity: opts.emissive ?? 1.1,
    color: opts.color ?? 0xffffff,
    roughness: opts.roughness ?? 0.75,
    metalness: opts.metalness ?? 0.15,
  });
  WINDOW_MATS.push(m);
  return m;
}
function bx(parent, w, h, d, mat, x, y, z, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = true;
  parent.add(m);
  return m;
}

for (const bx0 of BLOCK_CENTERS) for (const bz0 of BLOCK_CENTERS) {
  if (PARK_BLOCKS.has(`${bx0},${bz0}`)) continue;
  const distC = Math.hypot(bx0, bz0);
  const t = Math.min(1, distC / 240);
  const maxH = THREE.MathUtils.lerp(140, 22, t);
  const count = 1 + Math.floor(rnd()*3);
  const placed = [];
  for (let i = 0; i < count; i++) {
    const w = 16 + rnd()*18, d = 16 + rnd()*18, h = 12 + rnd()*maxH;
    const half = BLOCK_SIZE/2 - Math.max(w, d)/2 - 2;
    const ox = (rnd()*2-1) * Math.max(2, half-4);
    const oz = (rnd()*2-1) * Math.max(2, half-4);
    let ok = true;
    for (const p of placed) if (Math.hypot(p.x-ox, p.z-oz) < (p.s + Math.max(w,d))/2 + 2) { ok = false; break; }
    if (!ok) continue;
    placed.push({ x: ox, z: oz, s: Math.max(w, d) });

    const g = new THREE.Group();
    g.position.set(bx0+ox, 0, bz0+oz);
    g.rotation.y = (rnd() < 0.5 ? 0 : Math.PI/2) * (rnd() < 0.3 ? -1 : 1);

    const isGlass = h > 55 && rnd() < 0.5;
    const tex = isGlass ? GLASS_TEX : (h > 30 ? OFFICE_TEX : RESI_TEX);
    const rx = Math.max(1, Math.round(w/5));
    const ry = Math.max(1, Math.round(h/5));
    const body = matFromTex(tex, rx, ry, {
      emissive: 1.1,
      color: isGlass ? 0xa8c0e0 : (h > 30 ? 0xc0c4d0 : 0xc0a890),
      roughness: isGlass ? 0.15 : 0.8,
      metalness: isGlass ? 0.7 : 0.12,
    });
    bx(g, w, h, d, body, 0, h/2 + 0.3, 0);

    // Podium storefront
    if (h > 25) {
      const sf = matFromTex(STORE_TEX, Math.max(2, Math.round(w/6)), 1, {
        emissive: 1.7, roughness: 0.35, metalness: 0.3,
      });
      bx(g, w + 0.2, 3.2, d + 0.2, sf, 0, 1.9, 0);
    }

    // Roof
    const roof = bx(g, w + 0.6, 0.5, d + 0.6, ROOF_MAT, 0, h + 0.55, 0);
    // AC units
    const acN = 1 + Math.floor(rnd()*3);
    for (let a = 0; a < acN; a++) {
      bx(g, 2+rnd()*2, 1.2, 2+rnd()*2, AC_MAT,
        (rnd()-.5)*w*0.5, h + 1.4, (rnd()-.5)*d*0.5);
    }
    // Antenna
    if (h > 40) {
      const ah = 8 + rnd()*8;
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, ah, 6), ANTENNA_MAT);
      ant.position.set(0, h + ah/2 + 0.8, 0);
      g.add(ant);
      const bc = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), BEACON_MAT);
      bc.position.set(0, h + ah + 0.8, 0);
      g.add(bc);
    }
    // Billboard
    if (h > 35 && rnd() < 0.5) {
      const words = ['APEX','NOVA','VICE','CITY','NEON','ROCK'];
      const hues = [200, 320, 20, 280, 160];
      const t2 = makeBillboardTex(words[Math.floor(rnd()*words.length)], hues[Math.floor(rnd()*hues.length)]);
      const bm = new THREE.MeshBasicMaterial({ map: t2, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
      SIGN_MATS.push(bm);
      const bbW = Math.min(w*0.9, 12), bbH = bbW*0.5;
      const bb = new THREE.Mesh(new THREE.PlaneGeometry(bbW, bbH), bm);
      bb.position.set(0, h + bbH/2 + 1.5, -d/2 - 0.4);
      g.add(bb);
    }
    scene.add(g);
  }
}

// Lamps
{
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.5, metalness: 0.7 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0x333338, emissive: 0xffe6b0, emissiveIntensity: 0.6 });
  LAMP_MATS.push(headMat);
  const positions = [];
  for (const s of STREETS) for (let p = -260; p <= 260; p += 60) {
    positions.push([s - STREET_WIDTH/2 - 1.5, p]);
    positions.push([s + STREET_WIDTH/2 + 1.5, p + 30]);
    positions.push([p, s - STREET_WIDTH/2 - 1.5]);
    positions.push([p + 30, s + STREET_WIDTH/2 + 1.5]);
  }
  for (let p = -240; p <= 240; p += 60) {
    positions.push([p, -HWY_HALF - HWY_W/2 + 1.2, HWY_Y]);
    positions.push([p,  HWY_HALF + HWY_W/2 - 1.2, HWY_Y]);
    positions.push([-HWY_HALF - HWY_W/2 + 1.2, p, HWY_Y]);
    positions.push([ HWY_HALF + HWY_W/2 - 1.2, p, HWY_Y]);
  }
  const poleIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.18, 7, 6), poleMat, positions.length);
  const headIM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 10, 8), headMat, positions.length);
  const dm = new THREE.Object3D();
  for (let i = 0; i < positions.length; i++) {
    const [x, z, y] = positions[i];
    const b = y ?? 0;
    dm.position.set(x, b + 3.5, z); dm.updateMatrix(); poleIM.setMatrixAt(i, dm.matrix);
    dm.position.set(x, b + 7.3, z); dm.updateMatrix(); headIM.setMatrixAt(i, dm.matrix);
  }
  poleIM.instanceMatrix.needsUpdate = true;
  headIM.instanceMatrix.needsUpdate = true;
  scene.add(poleIM, headIM);

  const c = cnv(128, 128), x = c.getContext('2d');
  const grd = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,230,176,1)');
  grd.addColorStop(0.4, 'rgba(255,200,120,0.4)');
  grd.addColorStop(1, 'rgba(255,180,80,0)');
  x.fillStyle = grd; x.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const grp = new THREE.Group();
  for (const [x2, z2, y2] of positions) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    sp.scale.set(6, 6, 1);
    sp.position.set(x2, (y2 ?? 0) + 7.3, z2);
    grp.add(sp);
  }
  scene.add(grp);
  LAMP_GLOW = { grp, opacity: 0.8 };
}

// Trees
{
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3224, roughness: 0.95 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a5a3a, roughness: 0.9 });
  const tr = [];
  for (const key of PARK_BLOCKS) {
    const [bx0, bz0] = key.split(',').map(Number);
    const n = 6 + Math.floor(rnd()*6);
    for (let i = 0; i < n; i++) {
      tr.push([bx0 + (rnd()*2-1)*(BLOCK_SIZE/2-6), bz0 + (rnd()*2-1)*(BLOCK_SIZE/2-6), 0.8 + rnd()*0.6]);
    }
  }
  const tIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.55, 3, 6), trunkMat, tr.length);
  const lIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.6, 1), leafMat, tr.length);
  const dm = new THREE.Object3D();
  for (let i = 0; i < tr.length; i++) {
    const [x, z, s] = tr[i];
    dm.position.set(x, 1.5*s + 0.3, z);
    dm.scale.setScalar(s); dm.rotation.y = rnd()*Math.PI*2;
    dm.updateMatrix(); tIM.setMatrixAt(i, dm.matrix);
    dm.position.set(x, 4.2*s + 0.3, z);
    dm.updateMatrix(); lIM.setMatrixAt(i, dm.matrix);
    dm.scale.setScalar(1); dm.rotation.set(0, 0, 0);
  }
  tIM.instanceMatrix.needsUpdate = true;
  lIM.instanceMatrix.needsUpdate = true;
  scene.add(tIM, lIM);
}

// Highway
{
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.88, metalness: 0.05 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c8, roughness: 0.4, metalness: 0.6 });
  const railNeon = new THREE.MeshStandardMaterial({ color: 0x38f7c0, emissive: 0x38f7c0, emissiveIntensity: 1.4 });
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.85, metalness: 0.1 });

  function segment(x, z, w, d) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, d), deckMat);
    deck.position.set(x, HWY_Y - 0.6, z);
    deck.receiveShadow = true; deck.castShadow = true;
    scene.add(deck);
    const railH = 1.1;
    if (d < w) {
      for (const sgn of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(w, railH, 0.35), railMat);
        rail.position.set(x, HWY_Y + railH/2, z + sgn*(d/2 - 0.2));
        scene.add(rail);
        const neon = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.16), railNeon);
        neon.position.set(x, HWY_Y + railH + 0.02, z + sgn*(d/2 - 0.2));
        scene.add(neon);
      }
    } else {
      for (const sgn of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, railH, d), railMat);
        rail.position.set(x + sgn*(w/2 - 0.2), HWY_Y + railH/2, z);
        scene.add(rail);
        const neon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, d), railNeon);
        neon.position.set(x + sgn*(w/2 - 0.2), HWY_Y + railH + 0.02, z);
        scene.add(neon);
      }
    }
  }
  segment(0, -HWY_HALF, HWY_HALF*2, HWY_W);
  segment(0,  HWY_HALF, HWY_HALF*2, HWY_W);
  segment( HWY_HALF, 0, HWY_W, HWY_HALF*2);
  segment(-HWY_HALF, 0, HWY_W, HWY_HALF*2);
  for (let p = -240; p <= 240; p += 60) {
    for (const [x, z] of [[p, -HWY_HALF], [p, HWY_HALF], [-HWY_HALF, p], [HWY_HALF, p]]) {
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, HWY_Y - 1.2, 8), pillarMat);
      pil.position.set(x, (HWY_Y - 1.2)/2, z);
      pil.castShadow = true; scene.add(pil);
    }
  }
}

// Ramps
{
  const rampMat = new THREE.MeshStandardMaterial({ color: 0x2a2e38, roughness: 0.7, metalness: 0.4 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 1.0 });
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  for (const r of RAMPS) {
    const g = new THREE.Group();
    g.position.set(r.x, 0, r.z);
    g.rotation.y = r.rot;
    const ang = Math.atan2(r.h, r.d);
    const len = Math.hypot(r.h, r.d);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.5, len), rampMat);
    plate.rotation.x = -ang; plate.position.y = r.h/2;
    plate.castShadow = true; plate.receiveShadow = true;
    g.add(plate);
    const rl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, len), railMat);
    rl.rotation.x = -ang; rl.position.set(-r.w/2, r.h/2 + 0.55, 0); g.add(rl);
    const rr = rl.clone(); rr.position.x = r.w/2; g.add(rr);
    const st = new THREE.Mesh(new THREE.BoxGeometry(r.w + 0.2, 0.12, 1.2), stripeMat);
    st.position.set(0, r.h + 0.05, r.d/2 - 0.4); st.rotation.x = -ang; g.add(st);
    scene.add(g);
  }
}

// Checkpoints
const CHECKPOINTS = RAMPS.map(r => ({
  x: r.x - r._ax * (r.d/2 + 14),
  y: r.h + 6,
  z: r.z - r._az * (r.d/2 + 14),
}));
{
  const grp = new THREE.Group(); scene.add(grp);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffbf35, transparent: true, opacity: 0.92 });
  for (const cp of CHECKPOINTS) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.4, 12, 32), ringMat);
    ring.position.set(cp.x, cp.y, cp.z);
    grp.add(ring);
  }
}

// ==================== CAR BUILDERS ====================
function carBase(colorHex) {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.9, roughness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 0.5, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x84c9ff, metalness: 0.4, roughness: 0.08, transparent: true, opacity: 0.75 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.15 });
  g.userData.bodyMaterial = body;
  g.userData.dark = dark;
  g.userData.glass = glass;
  g.userData.chrome = chrome;
  return g;
}
function bxp(parent, w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; parent.add(m);
  return m;
}
function addWheels(parent, xs, zs, r, dark, chrome) {
  const wheels = [];
  for (const x of xs) for (const z of zs) {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.32, 16), dark);
    tire.rotation.z = Math.PI/2; tire.castShadow = true;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r*0.65, r*0.65, 0.34, 12), chrome);
    rim.rotation.z = Math.PI/2;
    w.add(tire, rim);
    w.position.set(x, r + 0.02, z);
    parent.add(w);
    wheels.push(tire);
  }
  return wheels;
}
function addLights(parent, xs, y, z) {
  const hMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const tMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const x of xs) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.06), hMat);
    h.position.set(x, y, -Math.abs(z)); parent.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.06), tMat);
    t.position.set(x, y, Math.abs(z)); parent.add(t);
  }
}

const BUILDERS = {
  m5(colorHex) {
    const g = carBase(colorHex);
    const { bodyMaterial: m, dark, glass, chrome } = g.userData;
    bxp(g, 2.0, 0.55, 4.7, m, 0, 0.72, 0);
    bxp(g, 1.92, 0.18, 1.55, m, 0, 1.02, -1.55);
    bxp(g, 1.78, 0.55, 2.05, glass, 0, 1.32, 0.1);
    bxp(g, 1.72, 0.06, 1.95, m, 0, 1.6, 0.1);
    bxp(g, 1.92, 0.18, 0.9, m, 0, 1.02, 1.65);
    for (const x of [-1, 1]) bxp(g, 0.06, 0.2, 3.4, dark, x, 0.5, 0);
    const wheels = addWheels(g, [-1, 1], [-1.55, 1.5], 0.42, dark, chrome);
    addLights(g, [-0.7, 0.7], 0.85, 2.36);
    g.userData.wheels = wheels;
    return g;
  },
  m4(colorHex) {
    const g = carBase(colorHex);
    const { bodyMaterial: m, dark, glass, chrome } = g.userData;
    bxp(g, 2.02, 0.5, 4.55, m, 0, 0.68, 0);
    bxp(g, 1.94, 0.16, 1.65, m, 0, 0.95, -1.4);
    bxp(g, 1.72, 0.42, 1.35, glass, 0, 1.2, 0.3);
    bxp(g, 1.55, 0.3, 0.85, glass, 0, 1.05, 1.05);
    bxp(g, 1.48, 0.06, 1.3, m, 0, 1.42, 0.3);
    bxp(g, 1.35, 0.05, 0.75, m, 0, 1.2, 1.05);
    bxp(g, 1.92, 0.15, 1.0, m, 0, 0.96, 1.7);
    for (const x of [-1.02, 1.02]) bxp(g, 0.08, 0.22, 3.3, dark, x, 0.48, 0);
    bxp(g, 1.55, 0.06, 0.25, dark, 0, 1.1, 2.18);
    const wheels = addWheels(g, [-1.02, 1.02], [-1.55, 1.45], 0.44, dark, chrome);
    addLights(g, [-0.72, 0.72], 0.8, 2.28);
    g.userData.wheels = wheels;
    return g;
  },
  muscle(colorHex) {
    const g = carBase(colorHex);
    const { bodyMaterial: m, dark, glass, chrome } = g.userData;
    bxp(g, 2.15, 0.6, 4.8, m, 0, 0.74, 0);
    bxp(g, 2.05, 0.16, 2.0, m, 0, 1.06, -1.4);
    bxp(g, 0.9, 0.18, 0.9, dark, 0, 1.2, -1.35);
    bxp(g, 1.8, 0.55, 1.7, glass, 0, 1.34, 0.35);
    bxp(g, 1.72, 0.06, 1.6, m, 0, 1.62, 0.35);
    bxp(g, 2.0, 0.16, 0.85, m, 0, 1.06, 1.8);
    bxp(g, 1.7, 0.05, 0.3, dark, 0, 1.15, 2.32);
    const wheels = addWheels(g, [-1.08, 1.08], [-1.6, 1.55], 0.47, dark, chrome);
    addLights(g, [-0.75, 0.75], 0.85, 2.42);
    g.userData.wheels = wheels;
    return g;
  },
  suv(colorHex) {
    const g = carBase(colorHex);
    const { bodyMaterial: m, dark, glass, chrome } = g.userData;
    bxp(g, 2.0, 1.05, 4.55, m, 0, 1.2, 0);
    bxp(g, 1.9, 0.55, 1.3, glass, 0, 1.95, -0.3);
    bxp(g, 1.95, 0.08, 1.3, m, 0, 2.25, -0.3);
    bxp(g, 1.95, 0.08, 1.45, m, 0, 2.25, 1.1);
    bxp(g, 2.0, 0.55, 1.45, m, 0, 1.95, 1.1);
    bxp(g, 1.95, 0.15, 1.2, m, 0, 1.75, -1.6);
    for (const x of [-1.05, 1.05]) bxp(g, 0.14, 0.1, 3.2, dark, x, 0.62, 0);
    const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 16), dark);
    spare.rotation.x = Math.PI/2; spare.position.set(0, 1.45, 2.42);
    g.add(spare);
    const wheels = addWheels(g, [-1.02, 1.02], [-1.55, 1.5], 0.55, dark, chrome);
    addLights(g, [-0.7, 0.7], 1.55, 2.3);
    g.userData.wheels = wheels;
    return g;
  },
  lambo(colorHex) {
    const g = carBase(colorHex);
    const { bodyMaterial: m, dark, glass, chrome } = g.userData;
    bxp(g, 2.05, 0.42, 4.65, m, 0, 0.58, 0);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 1.55), m);
    hood.position.set(0, 0.9, -1.55); hood.rotation.x = -0.16;
    hood.castShadow = true; g.add(hood);
    bxp(g, 1.55, 0.42, 1.55, glass, 0, 1.02, 0.2);
    bxp(g, 1.48, 0.05, 1.45, m, 0, 1.24, 0.2);
    bxp(g, 1.95, 0.2, 1.3, m, 0, 0.85, 1.55);
    bxp(g, 0.1, 0.4, 0.3, dark, -0.75, 1.15, 2.05);
    bxp(g, 0.1, 0.4, 0.3, dark,  0.75, 1.15, 2.05);
    bxp(g, 2.05, 0.08, 0.55, dark, 0, 1.4, 2.1);
    bxp(g, 1.9, 0.2, 0.4, dark, 0, 0.4, 2.32);
    for (let i = -2; i <= 2; i++) bxp(g, 0.08, 0.28, 0.35, chrome, i*0.35, 0.32, 2.35);
    for (const x of [-1.05, 1.05]) bxp(g, 0.1, 0.2, 3.5, dark, x, 0.42, 0);
    const wheels = addWheels(g, [-1.05, 1.05], [-1.65, 1.55], 0.42, dark, chrome);
    addLights(g, [-0.75, 0.75], 0.78, 2.36);
    g.userData.wheels = wheels;
    return g;
  },
  jesko(colorHex) {
    const g = carBase(colorHex);
    const { bodyMaterial: m, dark, glass, chrome } = g.userData;
    bxp(g, 2.15, 0.38, 4.85, m, 0, 0.55, 0);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.1, 1.75), m);
    hood.position.set(0, 0.86, -1.55); hood.rotation.x = -0.13;
    hood.castShadow = true; g.add(hood);
    bxp(g, 1.45, 0.38, 1.45, glass, 0, 0.98, 0.15);
    bxp(g, 1.38, 0.05, 1.35, m, 0, 1.19, 0.15);
    bxp(g, 2.05, 0.15, 1.35, m, 0, 0.8, 1.6);
    bxp(g, 0.1, 0.65, 1.3, dark, 0, 1.25, 1.65);
    for (const x of [-0.65, 0.65]) bxp(g, 0.12, 0.85, 0.2, dark, x, 1.55, 2.1);
    bxp(g, 2.2, 0.1, 0.65, dark, 0, 2.0, 2.15);
    bxp(g, 2.0, 0.06, 0.3, dark, 0, 1.65, 2.05);
    bxp(g, 2.0, 0.3, 0.55, dark, 0, 0.38, 2.42);
    for (let i = -3; i <= 3; i++) bxp(g, 0.07, 0.36, 0.45, chrome, i*0.28, 0.3, 2.42);
    for (const x of [-1.1, 1.1]) bxp(g, 0.12, 0.22, 3.6, dark, x, 0.4, 0);
    const wheels = addWheels(g, [-1.08, 1.08], [-1.7, 1.65], 0.4, dark, chrome);
    addLights(g, [-0.78, 0.78], 0.72, 2.46);
    g.userData.wheels = wheels;
    return g;
  },
};
function makeCar(classId, colorHex, opts = {}) {
  const cls = getCarClass(classId);
  const g = (BUILDERS[cls.id] || BUILDERS.m5)(colorHex);
  g.userData.classId = cls.id;
  if (opts.headlight) {
    const spot = new THREE.SpotLight(0xfff0d0, 10, 45, 0.45, 0.6, 1.2);
    spot.position.set(0, 1, -2);
    spot.target.position.set(0, 0, -25);
    g.add(spot, spot.target);
  }
  return g;
}

// ==================== PLAYER, TRAFFIC, COINS ====================
const player = makeCar(selectedCarClass, playerColor, { headlight: true });
player.position.set(P.x, P.y, P.z);
player.rotation.y = P.heading;
scene.add(player);

const trafficCars = [];
const hwyTraffic = [];
const parkedCars = [];
const coinPickups = [];
let playerRef = player;

function randomClassId() {
  const r = Math.random();
  if (r < 0.35) return 'm5';
  if (r < 0.6) return 'm4';
  if (r < 0.75) return 'muscle';
  if (r < 0.87) return 'suv';
  if (r < 0.96) return 'lambo';
  return 'jesko';
}
function randomColor() { return TRAFFIC_COLORS[Math.floor(Math.random()*TRAFFIC_COLORS.length)]; }

for (let i = 0; i < 40; i++) {
  const axis = Math.random() < 0.5 ? 'x' : 'z';
  const street = STREETS[Math.floor(Math.random()*STREETS.length)];
  const dir = Math.random() < 0.5 ? 1 : -1;
  const lane = dir * (STREET_WIDTH/4);
  const c = makeCar(randomClassId(), randomColor());
  scene.add(c);
  trafficCars.push({ mesh: c, axis, street, dir, lane, pos: (Math.random()*2-1)*240, speed: 14 + Math.random()*10, taken: false, respawnAt: 0 });
}
for (let i = 0; i < 20; i++) {
  const axis = Math.random() < 0.5 ? 'x' : 'z';
  const side = Math.random() < 0.5 ? -1 : 1;
  const dir = Math.random() < 0.5 ? 1 : -1;
  const off = dir * (HWY_W/6);
  const c = makeCar(randomClassId(), randomColor());
  scene.add(c);
  hwyTraffic.push({ mesh: c, axis, side, dir, off, pos: (Math.random()*2-1)*240, speed: 26 + Math.random()*12, taken: false, respawnAt: 0 });
}
for (const s of STREETS) {
  for (let p = -240; p <= 240; p += 24) {
    if (Math.abs(Math.abs(p) - Math.abs(s)) < 30) continue;
    if (Math.random() < 0.4) {
      const c = makeCar(randomClassId(), randomColor());
      c.position.set(s + STREET_WIDTH/2 - 2.5, 0.3, p);
      c.rotation.y = Math.PI;
      scene.add(c);
      parkedCars.push({ mesh: c, taken: false, respawnAt: 0, x: c.position.x, z: c.position.z, rot: c.rotation.y });
    }
    if (Math.random() < 0.4) {
      const c = makeCar(randomClassId(), randomColor());
      c.position.set(p, 0.3, s - STREET_WIDTH/2 + 2.5);
      c.rotation.y = Math.PI/2;
      scene.add(c);
      parkedCars.push({ mesh: c, taken: false, respawnAt: 0, x: c.position.x, z: c.position.z, rot: c.rotation.y });
    }
  }
}
const coinGeo = new THREE.TorusGeometry(0.7, 0.22, 8, 20);
const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0xffb020, emissiveIntensity: 1.4, metalness: 0.9, roughness: 0.2 });
for (let i = 0; i < 60; i++) {
  const x = (Math.random()*2-1)*260, z = (Math.random()*2-1)*260;
  const m = new THREE.Mesh(coinGeo, coinMat);
  m.position.set(x, 1.5, z); m.rotation.x = Math.PI/2;
  scene.add(m);
  coinPickups.push({ mesh: m, x, z, spin: Math.random()*Math.PI*2, taken: false, respawnAt: 0 });
}
for (let i = 0; i < 30; i++) {
  const axis = Math.random() < 0.5 ? 'x' : 'z';
  const side = Math.random() < 0.5 ? -1 : 1;
  const p = (Math.random()*2-1)*240;
  const x = axis === 'x' ? p : side * HWY_HALF;
  const z = axis === 'x' ? side * HWY_HALF : p;
  const m = new THREE.Mesh(coinGeo, coinMat);
  m.position.set(x, HWY_Y + 1.5, z); m.rotation.x = Math.PI/2;
  scene.add(m);
  coinPickups.push({ mesh: m, x, z, y: HWY_Y + 1.5, spin: Math.random()*Math.PI*2, taken: false, respawnAt: 0 });
                                                 }      col += sunColor * pow(max(sd, 0.0), 400.0) * 3.0;
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

// ==================== INPUT ====================
const blockKeys = ['w','a','s','d',' ','arrowup','arrowdown','arrowleft','arrowright','shift'];
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (blockKeys.includes(k)) e.preventDefault();
  if (k === 'c') cycleCam();
  if (k === 'escape' && game.started) setPaused(!game.paused);
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function bindTouch(el, key) {
  const on  = e => { e.preventDefault(); keys[key] = true; };
  const off = e => { e.preventDefault(); keys[key] = false; };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off);
  el.addEventListener('pointerleave', off);
}
document.querySelectorAll('[data-key]').forEach(el => bindTouch(el, el.dataset.key));

// ==================== RAMP HELPERS ====================
function rampAt(x, z) {
  for (const r of RAMPS) {
    const dx = x - r.x, dz = z - r.z;
    const lx = r._c * dx - r._s * dz;
    const lz = r._s * dx + r._c * dz;
    if (Math.abs(lx) <= r.w/2 && Math.abs(lz) <= r.d/2) return { ramp: r, lx, lz };
  }
  return null;
}
function groundHeightAt(x, z, currentY) {
  let best = 0;
  for (const p of PLATFORMS) {
    const dx = x - p.x, dz = z - p.z;
    if (Math.abs(dx) <= p.w/2 && Math.abs(dz) <= p.d/2 && currentY >= p.y - 3) {
      best = Math.max(best, p.y);
    }
  }
  const hit = rampAt(x, z);
  if (hit) {
    const t = (hit.lz + hit.ramp.d/2) / hit.ramp.d;
    const s = t * hit.ramp.h;
    if (s > best) best = s;
  }
  return best;
}

// ==================== TAKE-OVER + AIR POPUPS ====================
const swapHintEl = $('swapHint');
const airPopEl = $('airPop');
let swapTimer = null, airTimer = null;

function showSwapHint(text, bad) {
  swapHintEl.textContent = text;
  swapHintEl.classList.toggle('bad', !!bad);
  swapHintEl.classList.add('show');
  clearTimeout(swapTimer);
  swapTimer = setTimeout(() => swapHintEl.classList.remove('show'), 1600);
}
function showAirPop(text) {
  airPopEl.textContent = text;
  airPopEl.classList.add('on');
  clearTimeout(airTimer);
  airTimer = setTimeout(() => airPopEl.classList.remove('on'), 900);
}

function tryTakeOver(target) {
  if (P.swapCooldown > 0) return;
  const clsId = target.mesh.userData.classId || 'm5';
  const cls = getCarClass(clsId);
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

  scene.remove(playerRef);
  const newCar = makeCar(clsId, playerColor, { headlight: true });
  newCar.position.set(targetPos.x, P.y, targetPos.z);
  scene.add(newCar);
  playerRef = newCar;
  // Replace `player` const usages by reassigning through a wrapper object
  window.__player = newCar;
  P.carClass = clsId;
  P.heading = targetRotY;
  P.speed *= 0.6;
  P.swapCooldown = 2.0;
  $('carClassEl').textContent = cls.name;
  showSwapHint(`SHIFTED INTO ${cls.name}  −${cls.cost}¢`);
}

function respawnVehicle(veh) {
  const clsId = randomClassId();
  const newMesh = makeCar(clsId, randomColor());
  scene.remove(veh.mesh);
  veh.mesh = newMesh;
  veh.taken = false;
  veh.respawnAt = 0;
  if (veh.x !== undefined) {
    newMesh.position.set(veh.x, 0.3, veh.z);
    newMesh.rotation.y = veh.rot;
  } else if (veh.type === 'hwy') {
    veh.pos = (Math.random()*2-1)*240;
    if (veh.axis === 'x') newMesh.position.set(veh.pos, HWY_Y + 0.3, veh.side * HWY_HALF + veh.off);
    else newMesh.position.set(veh.side * HWY_HALF + veh.off, HWY_Y + 0.3, veh.pos);
  } else {
    veh.pos = (Math.random()*2-1)*240;
    newMesh.position.set(
      veh.axis === 'x' ? veh.pos : veh.street + veh.lane,
      0.3,
      veh.axis === 'x' ? veh.street + veh.lane : veh.pos
    );
  }
  scene.add(newMesh);
}
// Tag highway vehicles so respawn knows type
hwyTraffic.forEach(v => { v.type = 'hwy'; });

// ==================== PLAYER PHYSICS ====================
function updatePlayer(dt) {
  const player = window.__player || playerRef;
  const cls = getCarClass(P.carClass);
  const throttle = keys['w'] ? 1 : 0;
  const brake    = keys['s'] ? 1 : 0;
  // FIXED steering: A = left (heading increases), D = right (heading decreases)
  const steer    = (keys['a'] ? 1 : 0) - (keys['d'] ? 1 : 0);
  const nitro    = keys['shift'] && P.nitro > 0 && !P.airborne;

  if (throttle) P.speed += (nitro ? cls.accel * 1.6 : cls.accel) * dt;
  if (brake)    P.speed -= 38 * dt;
  if (!throttle && !brake) {
    const fr = 6 * dt;
    P.speed -= Math.sign(P.speed) * Math.min(Math.abs(P.speed), fr);
  }
  if (P.airborne) {
    const drag = 1.5 * dt;
    P.speed -= Math.sign(P.speed) * Math.min(Math.abs(P.speed), drag);
  }
  if (nitro) P.nitro = Math.max(0, P.nitro - 24 * dt);
  else       P.nitro = Math.min(100, P.nitro + 4.5 * dt);
  P.speed = Math.max(-22, Math.min(nitro ? cls.speed * 1.35 : cls.speed, P.speed));

  if (!P.airborne) {
    const grip = Math.min(Math.abs(P.speed) / 18, 1) * cls.grip;
    P.heading += steer * dt * 2.1 * grip * Math.sign(P.speed || 1);
  } else {
    P.heading += steer * dt * 1.1;
  }

  const vxWorld = -Math.sin(P.heading) * P.speed;
  const vzWorld = -Math.cos(P.heading) * P.speed;
  let nx = P.x + vxWorld * dt;
  let nz = P.z + vzWorld * dt;

  // Ramp blocking — prevents phasing through the wrong side
  let blocked = false;
  const hitRamp = rampAt(nx, nz);
  if (hitRamp) {
    const t = (hitRamp.lz + hitRamp.ramp.d / 2) / hitRamp.ramp.d;
    const surface = t * hitRamp.ramp.h;
    if (!P.airborne && surface > P.y + 1.2) blocked = true;
  }
  if (blocked) P.speed *= -0.25;
  else { P.x = nx; P.z = nz; }

  const bx = WORLD_HALF - 8;
  if (P.x < -bx) { P.x = -bx; P.speed *= 0.6; }
  if (P.x >  bx) { P.x =  bx; P.speed *= 0.6; }
  if (P.z < -bx) { P.z = -bx; P.speed *= 0.6; }
  if (P.z >  bx) { P.z =  bx; P.speed *= 0.6; }

  const here = rampAt(P.x, P.z);
  let rampSurface = 0, rampSlope = 0, rampAx = 0, rampAz = 0;
  if (here) {
    const t = (here.lz + here.ramp.d / 2) / here.ramp.d;
    rampSurface = t * here.ramp.h;
    rampSlope = here.ramp._slope;
    rampAx = here.ramp._ax;
    rampAz = here.ramp._az;
  }
  const gh = groundHeightAt(P.x, P.z, P.y);

  if (P.airborne) {
    P.vy -= 26 * dt;
    P.y += P.vy * dt;
    P.airTime += dt;
    if (P.y <= gh) {
      P.y = gh;
      P.vy = 0;
      P.airborne = false;
      if (P.airTime > 0.35) {
        const reward = Math.round(P.airTime * 900 + P.bestAir * 40);
        P.score += reward;
        P.coins += Math.round(reward / 40);
        if (P.airTime > P.bestAir) P.bestAir = P.airTime;
        showAirPop(`+${reward} AIR (${P.airTime.toFixed(2)}s)  +${Math.round(reward/40)}¢`);
      }
      P.airTime = 0;
    }
  } else {
    if (gh < P.y - 0.15) {
      P.airborne = true;
      P.airTime = 0;
      if (rampSurface > 0) {
        const along = vxWorld * rampAx + vzWorld * rampAz;
        P.vy = Math.max(-3, Math.min(14, rampSlope * along));
      } else P.vy = 0;
    } else {
      P.y = gh;
      if (rampSurface > 0) {
        const along = vxWorld * rampAx + vzWorld * rampAz;
        P.vy = Math.max(-3, Math.min(14, rampSlope * along));
      } else P.vy = 0;
    }
  }

  P.gear = Math.max(1, Math.min(6, Math.ceil(Math.abs(P.speed) / 10)));
  player.position.set(P.x, P.y, P.z);
  player.rotation.y = P.heading;
  player.userData.wheels.forEach(w => w.rotation.x -= P.speed * dt * 1.9);

  // Checkpoint
  const cp = CHECKPOINTS[P.cpIndex];
  if (Math.hypot(P.x - cp.x, P.y - cp.y, P.z - cp.z) < 4.4) {
    P.score += 1500 + (P.airborne ? 800 : 0);
    P.coins += 25 + (P.airborne ? 15 : 0);
    P.cpIndex = (P.cpIndex + 1) % CHECKPOINTS.length;
  }

  // Coins
  const now = performance.now();
  for (const c of coinPickups) {
    if (c.taken) continue;
    const cy = c.y ?? 1.5;
    if (Math.hypot(P.x - c.x, P.z - c.z) < 2.5 && Math.abs(P.y - cy) < 3) {
      c.taken = true;
      c.respawnAt = now + 15000;
      c.mesh.visible = false;
      P.coins += 5;
      P.score += 200;
    }
  }

  // Take-over
  if (P.swapCooldown > 0) P.swapCooldown -= dt;
  else {
    const R = 3.2;
    for (const t of trafficCars) {
      if (t.taken) continue;
      if (Math.hypot(P.x - t.mesh.position.x, P.z - t.mesh.position.z) < R &&
          Math.abs(P.y - t.mesh.position.y) < 2.5) { tryTakeOver(t); return; }
    }
    for (const t of hwyTraffic) {
      if (t.taken) continue;
      if (Math.hypot(P.x - t.mesh.position.x, P.z - t.mesh.position.z) < R &&
          Math.abs(P.y - t.mesh.position.y) < 2.5) { tryTakeOver(t); return; }
    }
    for (const t of parkedCars) {
      if (t.taken) continue;
      if (Math.hypot(P.x - t.mesh.position.x, P.z - t.mesh.position.z) < R &&
          Math.abs(P.y - t.mesh.position.y) < 2.5) { tryTakeOver(t); return; }
    }
  }
}

// ==================== TRAFFIC + COINS ====================
function updateTraffic(dt) {
  const bound = 240;
  for (const t of trafficCars) {
    if (t.taken) { if (performance.now() > t.respawnAt) respawnVehicle(t); continue; }
    t.pos += t.dir * t.speed * dt;
    if (t.pos > bound) t.pos = -bound;
    if (t.pos < -bound) t.pos = bound;
    if (t.axis === 'x') {
      t.mesh.position.set(t.pos, 0.3, t.street + t.lane);
      t.mesh.rotation.y = t.dir > 0 ? -Math.PI/2 : Math.PI/2;
    } else {
      t.mesh.position.set(t.street + t.lane, 0.3, t.pos);
      t.mesh.rotation.y = t.dir > 0 ? Math.PI : 0;
    }
    t.mesh.userData.wheels.forEach(w => w.rotation.x -= t.speed * dt * 2.5);
  }
  for (const t of hwyTraffic) {
    if (t.taken) { if (performance.now() > t.respawnAt) respawnVehicle(t); continue; }
    t.pos += t.dir * t.speed * dt;
    if (t.pos > bound) t.pos = -bound;
    if (t.pos < -bound) t.pos = bound;
    if (t.axis === 'x') {
      t.mesh.position.set(t.pos, HWY_Y + 0.3, t.side * HWY_HALF + t.off);
      t.mesh.rotation.y = t.dir > 0 ? -Math.PI/2 : Math.PI/2;
    } else {
      t.mesh.position.set(t.side * HWY_HALF + t.off, HWY_Y + 0.3, t.pos);
      t.mesh.rotation.y = t.dir > 0 ? Math.PI : 0;
    }
    t.mesh.userData.wheels.forEach(w => w.rotation.x -= t.speed * dt * 2.5);
  }
}
function updateCoins(now) {
  for (const c of coinPickups) {
    if (c.taken && now > c.respawnAt) { c.taken = false; c.mesh.visible = true; }
    if (!c.taken) {
      c.mesh.rotation.z += 0.02;
      const baseY = c.y ?? 1.5;
      c.mesh.position.y = baseY + Math.sin(now * 0.003 + c.spin) * 0.3;
    }
  }
}

// ==================== CAMERA ====================
function updateCamera(dt) {
  const tx = new THREE.Vector3(), look = new THREE.Vector3();
  if (game.camMode === 0) {
    tx.set(P.x + Math.sin(P.heading)*11, P.y + 5.5, P.z + Math.cos(P.heading)*11);
    look.set(P.x, P.y + 1.3, P.z);
  } else if (game.camMode === 1) {
    tx.set(P.x - Math.sin(P.heading)*0.4, P.y + 1.55, P.z - Math.cos(P.heading)*0.4);
    look.set(P.x - Math.sin(P.heading)*14, P.y + 1.1, P.z - Math.cos(P.heading)*14);
  } else {
    tx.set(P.x, P.y + 45, P.z + 0.5);
    look.set(P.x, P.y, P.z);
  }
  const k = 1 - Math.pow(0.0015, dt);
  camera.position.lerp(tx, k);
  camera.lookAt(look);
}

// ==================== TIME OF DAY ====================
const KEYS = [
  { h:0,   top:0x01020a,mid:0x050818,bot:0x0a0c1a,sun:0x101828,sunI:0.10,moonI:0.45,fog:0x08091a,fogD:0.0022,hemiS:0x2a3555,hemiG:0x0a0a15,hemiI:0.25,ambI:0.20 },
  { h:4.5, top:0x02030a,mid:0x0a1030,bot:0x151a3a,sun:0x1a2040,sunI:0.15,moonI:0.35,fog:0x0a0c1a,fogD:0.0020,hemiS:0x2a3555,hemiG:0x0a0a15,hemiI:0.30,ambI:0.22 },
  { h:6.5, top:0x4a7ab8,mid:0xa8c8e8,bot:0xffd0a0,sun:0xffd0a0,sunI:1.4, moonI:0.10,fog:0xa8b8c8,fogD:0.0018,hemiS:0x88bbee,hemiG:0x3a2a20,hemiI:0.75,ambI:0.35 },
  { h:9,   top:0x3a8ee8,mid:0x80b8e8,bot:0xc0e0ff,sun:0xffffff,sunI:2.6, moonI:0.0, fog:0xa8d0f0,fogD:0.0016,hemiS:0x88bbee,hemiG:0x2a2a30,hemiI:0.90,ambI:0.40 },
  { h:12,  top:0x3a8ee8,mid:0x80b8e8,bot:0xc0e0ff,sun:0xffffff,sunI:2.8, moonI:0.0, fog:0xa8d0f0,fogD:0.0014,hemiS:0x88bbee,hemiG:0x2a2a30,hemiI:0.95,ambI:0.45 },
  { h:15,  top:0x3a8ee8,mid:0x80b8e8,bot:0xc0e0ff,sun:0xfff0d8,sunI:2.6, moonI:0.0, fog:0xa8d0f0,fogD:0.0016,hemiS:0x88bbee,hemiG:0x2a2a30,hemiI:0.90,ambI:0.40 },
  { h:17.5,top:0x3a5ea8,mid:0xffa880,bot:0xff7040,sun:0xffb080,sunI:2.3, moonI:0.0, fog:0xc09080,fogD:0.0018,hemiS:0xa08080,hemiG:0x3a2020,hemiI:0.75,ambI:0.35 },
  { h:19,  top:0x2a2050,mid:0xa04050,bot:0xff6030,sun:0xff8040,sunI:1.1, moonI:0.10,fog:0x604050,fogD:0.0020,hemiS:0x805070,hemiG:0x1a0a10,hemiI:0.45,ambI:0.28 },
  { h:21,  top:0x0a0a2a,mid:0x1a1040,bot:0x402060,sun:0x303050,sunI:0.25,moonI:0.35,fog:0x1a1030,fogD:0.0022,hemiS:0x3a2a55,hemiG:0x0a0815,hemiI:0.30,ambI:0.22 },
  { h:24,  top:0x01020a,mid:0x050818,bot:0x0a0c1a,sun:0x101828,sunI:0.10,moonI:0.45,fog:0x08091a,fogD:0.0022,hemiS:0x2a3555,hemiG:0x0a0a15,hemiI:0.25,ambI:0.20 },
];
const _ca = new THREE.Color(), _cb = new THREE.Color(), _cc = new THREE.Color(), _cd = new THREE.Color();
function lerpKey(hour) {
  let a = KEYS[0], b = KEYS[KEYS.length-1];
  for (let i = 0; i < KEYS.length-1; i++) if (hour >= KEYS[i].h && hour <= KEYS[i+1].h) { a = KEYS[i]; b = KEYS[i+1]; break; }
  const t = (hour - a.h) / Math.max(0.001, b.h - a.h);
  const L = (av, bv) => av + (bv - av) * t;
  return {
    top: _ca.setHex(a.top).lerp(_cb.setHex(b.top), t).getHex(),
    mid: _cc.setHex(a.mid).lerp(_cd.setHex(b.mid), t).getHex(),
    bot: _ca.setHex(a.bot).lerp(_cb.setHex(b.bot), t).getHex(),
    sun: _cc.setHex(a.sun).lerp(_cd.setHex(b.sun), t).getHex(),
    fog: _ca.setHex(a.fog).lerp(_cb.setHex(b.fog), t).getHex(),
    sunI: L(a.sunI, b.sunI), moonI: L(a.moonI, b.moonI), fogD: L(a.fogD, b.fogD),
    hemiS: _cc.setHex(a.hemiS).lerp(_cd.setHex(b.hemiS), t).getHex(),
    hemiG: _ca.setHex(a.hemiG).lerp(_cb.setHex(b.hemiG), t).getHex(),
    hemiI: L(a.hemiI, b.hemiI), ambI: L(a.ambI, b.ambI),
  };
}
function applyTimeOfDay(t) {
  const k = lerpKey(t);
  skyUniforms.topColor.value.setHex(k.top);
  skyUniforms.midColor.value.setHex(k.mid);
  skyUniforms.bottomColor.value.setHex(k.bot);
  skyUniforms.sunColor.value.setHex(k.sun);
  scene.fog.color.setHex(k.fog);
  scene.fog.density = k.fogD;
  renderer.setClearColor(k.mid);

  const sunT = (t - 6) / 12 * Math.PI;
  const sx = Math.cos(sunT) * 300, sy = Math.sin(sunT) * 300;
  sun.position.set(sx, Math.max(-40, sy), 150);
  sun.target.position.set(0, 0, 0);
  moon.position.set(-sx, Math.max(30, -sy), -150);
  moon.target.position.set(0, 0, 0);
  sun.intensity = k.sunI; sun.color.setHex(k.sun);
  moon.intensity = k.moonI;
  hemi.color.setHex(k.hemiS);
  hemi.groundColor.setHex(k.hemiG);
  hemi.intensity = k.hemiI;
  amb.intensity = k.ambI;
  skyUniforms.sunPos.value.copy(sun.position).normalize();

  const dayness = Math.max(0, Math.min(1, (Math.sin(sunT) + 0.15) / 0.8));
  const night = 1 - dayness;
  for (const m of WINDOW_MATS) m.emissiveIntensity = 0.05 + night * 1.9;
  for (const m of LAMP_MATS) m.emissiveIntensity = 0.15 + night * 1.9;
  if (LAMP_GLOW) LAMP_GLOW.opacity = night * 0.9;
  for (const m of SIGN_MATS) m.opacity = 0.15 + night * 0.85;
}

// ==================== HUD ====================
function fmtHour(h) {
  const hh = Math.floor(h) % 24;
  const mm = Math.floor((h - Math.floor(h)) * 60);
  return String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0');
}
function updateHud(t) {
  if (!game.started) return;
  if (t - P.hudAt > 60) {
    P.hudAt = t;
    $('speedEl').textContent = Math.round(Math.abs(P.speed) * 3.6);
    $('gearEl').textContent = P.speed < -0.4 ? 'R' : P.speed < 0.7 ? 'N' : String(P.gear);
    $('nitroEl').style.width = P.nitro.toFixed(0) + '%';
    $('scoreEl').textContent = P.score.toLocaleString();
    $('cpEl').textContent = `${P.cpIndex}/${CHECKPOINTS.length}`;
    $('airEl').textContent = P.airTime.toFixed(1) + 's';
    $('bestAirEl').textContent = P.bestAir.toFixed(2) + 's';
  }
  if (t - P.clockAt > 200) {
    P.clockAt = t;
    $('clockEl').textContent = fmtHour(game.timeOfDay);
    $('coinCount').textContent = Math.floor(save.coins + P.coins).toLocaleString();
  }
}

// ==================== UI ====================
function renderTimeTiles() {
  const grid = $('timeGrid');
  grid.innerHTML = '';
  for (const p of TIME_PRESETS) {
    const can = save.coins >= p.cost;
    const d = document.createElement('button');
    d.className = 'time-tile' + (p === selectedPreset ? ' active' : '') + (can ? '' : ' locked');
    d.innerHTML = `<div class="swatch" style="background:${p.swatch}"></div><span class="label">${p.name}</span><span class="sub">${p.sub}</span>${p.cost > 0 ? `<span class="price"><i></i>${p.cost}</span>` : ''}`;
    d.addEventListener('click', () => {
      if (!can) return;
      selectedPreset = p;
      renderTimeTiles();
      updateStartBtn();
    });
    grid.appendChild(d);
  }
}
function renderCarTiles() {
  const grid = $('carGrid');
  grid.innerHTML = '';
  for (const c of CAR_CLASSES) {
    const can = save.coins >= c.cost;
    const d = document.createElement('button');
    d.className = 'car-tile' + (c.id === selectedCarClass ? ' active' : '') + (can ? '' : ' locked');
    d.innerHTML = `<span class="car-name">${c.name}</span><span class="car-sub">${c.sub}</span><div class="bars"><span>SPD</span><span class="bar"><i style="width:${c.spd*10}%"></i></span><span>ACC</span><span class="bar"><i style="width:${c.acc*10}%"></i></span><span>HDL</span><span class="bar"><i style="width:${c.hdl*10}%"></i></span></div><span class="cost ${c.cost === 0 ? 'free' : ''}">${c.cost === 0 ? 'FREE' : c.cost + '¢'}</span>`;
    d.addEventListener('click', () => {
      if (!can) return;
      selectedCarClass = c.id;
      renderCarTiles();
      updateStartBtn();
    });
    grid.appendChild(d);
  }
}
function updateStartBtn() {
  const total = selectedPreset.cost + getCarClass(selectedCarClass).cost;
  $('startBtn').innerHTML = total === 0 ? 'START ENGINE <span>›</span>' : `START ENGINE — ${total}¢ <span>›</span>`;
}
$('coinCount').textContent = Math.floor(save.coins).toLocaleString();
renderTimeTiles();
renderCarTiles();
updateStartBtn();

$('paintRow').addEventListener('click', e => {
  const btn = e.target.closest('button[data-color]');
  if (!btn) return;
  $('paintRow').querySelectorAll('button').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  playerColor = parseInt(btn.dataset.color.slice(1), 16);
  const p = window.__player || playerRef;
  if (p.userData.bodyMaterial) p.userData.bodyMaterial.color.setHex(playerColor);
});

$('startBtn').addEventListener('click', () => {
  const cls = getCarClass(selectedCarClass);
  const total = selectedPreset.cost + cls.cost;
  if (total > 0) {
    if (save.coins < total) return;
    save.coins -= total;
    saveGame(save);
    $('coinCount').textContent = Math.floor(save.coins).toLocaleString();
  }
  game.timeOfDay = selectedPreset.hour;
  scene.remove(playerRef);
  const newCar = makeCar(selectedCarClass, playerColor, { headlight: true });
  newCar.position.set(P.x, P.y, P.z);
  newCar.rotation.y = P.heading;
  scene.add(newCar);
  playerRef = newCar;
  window.__player = newCar;
  P.carClass = selectedCarClass;
  $('carClassEl').textContent = cls.name;

  game.started = true;
  game.paused = false;
  $('pauseBtn').textContent = 'Ⅱ';
  $('menu').style.display = 'none';
  $('hud').style.display = '';
  $('info').style.display = '';
  $('clock').style.display = '';
  if (matchMedia('(pointer: coarse)').matches) {
    $('p1Ctl').style.display = 'flex';
    $('pedalCtl').style.display = 'flex';
  }
  lastT = performance.now();
});

$('pauseBtn').addEventListener('click', () => {
  if (!game.started) return;
  if (!game.paused) {
    save.coins += P.coins;
    saveGame(save);
    $('coinCount').textContent = Math.floor(save.coins).toLocaleString();
  }
  setPaused(!game.paused);
});
$('fsBtn').addEventListener('click', () => document.documentElement.requestFullscreen?.());

setInterval(() => {
  if (game.started && !game.paused && P.coins > 0) {
    save.coins += P.coins;
    P.coins = 0;
    saveGame(save);
    $('coinCount').textContent = Math.floor(save.coins).toLocaleString();
  }
}, 8000);

// ==================== MAIN LOOP ====================
let lastT = performance.now();
window.__player = playerRef;

function loop(now) {
  const dt = Math.min(0.034, (now - lastT) / 1000);
  lastT = now;

  if (game.started && !game.paused) {
    updatePlayer(dt);
    game.timeOfDay = (game.timeOfDay + dt * SECONDS_PER_HOUR / 60) % 24;
  }
  updateTraffic(dt);
  updateCoins(now);
  updateCamera(dt);
  updateHud(now);
  applyTimeOfDay(game.timeOfDay);

  const sx = sun.position.x, sy = sun.position.y, sz = sun.position.z;
  sun.target.position.set(P.x, 0, P.z);
  sun.position.set(P.x + sx * 0.6, sy, P.z + sz * 0.6);
  sun.target.updateMatrixWorld();

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
applyTimeOfDay(game.timeOfDay);
requestAnimationFrame(loop);

function resize() {
  const w = canvasEl.clientWidth, h = canvasEl.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();
