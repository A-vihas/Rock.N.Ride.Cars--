import * as THREE from 'three';
import { SECONDS_PER_HOUR } from './config.js';
import { refs, timeOfDay } from './state.js';

const KEYS = [
  { h: 0,  top:0x01020a, mid:0x050818, bot:0x0a0c1a, sun:0x101828, sunI:0.10, moonI:0.45, fog:0x08091a, fogD:0.0022, hemiS:0x2a3555, hemiG:0x0a0a15, hemiI:0.25, ambI:0.20 },
  { h: 4.5,top:0x02030a, mid:0x0a1030, bot:0x151a3a, sun:0x1a2040, sunI:0.15, moonI:0.35, fog:0x0a0c1a, fogD:0.0020, hemiS:0x2a3555, hemiG:0x0a0a15, hemiI:0.30, ambI:0.22 },
  { h: 6.5,top:0x4a7ab8, mid:0xa8c8e8, bot:0xffd0a0, sun:0xffd0a0, sunI:1.4,  moonI:0.10, fog:0xa8b8c8, fogD:0.0018, hemiS:0x88bbee, hemiG:0x3a2a20, hemiI:0.75, ambI:0.35 },
  { h: 9,  top:0x3a8ee8, mid:0x80b8e8, bot:0xc0e0ff, sun:0xffffff, sunI:2.6,  moonI:0.0,  fog:0xa8d0f0, fogD:0.0016, hemiS:0x88bbee, hemiG:0x2a2a30, hemiI:0.90, ambI:0.40 },
  { h: 12, top:0x3a8ee8, mid:0x80b8e8, bot:0xc0e0ff, sun:0xffffff, sunI:2.8,  moonI:0.0,  fog:0xa8d0f0, fogD:0.0014, hemiS:0x88bbee, hemiG:0x2a2a30, hemiI:0.95, ambI:0.45 },
  { h: 15, top:0x3a8ee8, mid:0x80b8e8, bot:0xc0e0ff, sun:0xfff0d8, sunI:2.6,  moonI:0.0,  fog:0xa8d0f0, fogD:0.0016, hemiS:0x88bbee, hemiG:0x2a2a30, hemiI:0.90, ambI:0.40 },
  { h: 17.5,top:0x3a5ea8, mid:0xffa880, bot:0xff7040, sun:0xffb080, sunI:2.3, moonI:0.0,  fog:0xc09080, fogD:0.0018, hemiS:0xa08080, hemiG:0x3a2020, hemiI:0.75, ambI:0.35 },
  { h: 19, top:0x2a2050, mid:0xa04050, bot:0xff6030, sun:0xff8040, sunI:1.1, moonI:0.10, fog:0x604050, fogD:0.0020, hemiS:0x805070, hemiG:0x1a0a10, hemiI:0.45, ambI:0.28 },
  { h: 21, top:0x0a0a2a, mid:0x1a1040, bot:0x402060, sun:0x303050, sunI:0.25, moonI:0.35, fog:0x1a1030, fogD:0.0022, hemiS:0x3a2a55, hemiG:0x0a0815, hemiI:0.30, ambI:0.22 },
  { h: 24, top:0x01020a, mid:0x050818, bot:0x0a0c1a, sun:0x101828, sunI:0.10, moonI:0.45, fog:0x08091a, fogD:0.0022, hemiS:0x2a3555, hemiG:0x0a0a15, hemiI:0.25, ambI:0.20 },
];

const _ca = new THREE.Color(), _cb = new THREE.Color(), _cc = new THREE.Color(), _cd = new THREE.Color();

function lerpKey(hour) {
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (hour >= KEYS[i].h && hour <= KEYS[i + 1].h) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  }
  const t = (hour - a.h) / Math.max(0.001, b.h - a.h);
  const L = (av, bv) => av + (bv - av) * t;
  return {
    top:   _ca.setHex(a.top).lerp(_cb.setHex(b.top), t).getHex(),
    mid:   _cc.setHex(a.mid).lerp(_cd.setHex(b.mid), t).getHex(),
    bot:   _ca.setHex(a.bot).lerp(_cb.setHex(b.bot), t).getHex(),
    sun:   _cc.setHex(a.sun).lerp(_cd.setHex(b.sun), t).getHex(),
    fog:   _ca.setHex(a.fog).lerp(_cb.setHex(b.fog), t).getHex(),
    sunI: L(a.sunI, b.sunI), moonI: L(a.moonI, b.moonI), fogD: L(a.fogD, b.fogD),
    hemiS: _cc.setHex(a.hemiS).lerp(_cd.setHex(b.hemiS), t).getHex(),
    hemiG: _ca.setHex(a.hemiG).lerp(_cb.setHex(b.hemiG), t).getHex(),
    hemiI: L(a.hemiI, b.hemiI), ambI: L(a.ambI, b.ambI),
  };
}

export function applyTimeOfDay(t) {
  const k = lerpKey(t);
  const { skyUniforms, sun, moon, hemi, amb, lampGlow, windowMats, lampMats, signMats, scene, renderer } = refs;

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
  for (const m of windowMats) m.emissiveIntensity = 0.05 + night * 1.9;
  for (const m of lampMats) m.emissiveIntensity = 0.15 + night * 1.9;
  if (lampGlow) lampGlow.opacity = night * 0.9;
  for (const m of signMats) m.opacity = 0.15 + night * 0.85;
}

export function advanceTime(dt) {
  return (timeOfDay + dt * SECONDS_PER_HOUR / 60) % 24;
}
