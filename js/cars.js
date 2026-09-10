import * as THREE from 'three';
import { getCarClass } from './config.js';

function carBase(colorHex) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.9, roughness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 0.5, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x84c9ff, metalness: 0.4, roughness: 0.08, transparent: true, opacity: 0.75 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.15 });
  g.userData.bodyMaterial = mat;
  g.userData.dark = dark;
  g.userData.glass = glass;
  g.userData.chrome = chrome;
  return g;
}
function bx(parent, w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
function addWheels(parent, xs, zs, r, dark, chrome) {
  const wheels = [];
  for (const x of xs) for (const z of zs) {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.32, 20), dark);
    tire.rotation.z = Math.PI / 2; tire.castShadow = true;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.65, r * 0.65, 0.34, 16), chrome);
    rim.rotation.z = Math.PI / 2;
    w.add(tire, rim);
    w.position.set(x, r + 0.02, z);
    parent.add(w);
    wheels.push(tire);
  }
  return wheels;
}
function addHeadlights(parent, xs, y, z, w = 0.4) {
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const x of xs) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, 0.06), m);
    h.position.set(x, y, z); parent.add(h);
  }
}
function addTaillights(parent, xs, y, z, w = 0.42) {
  const m = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const x of xs) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.06), m);
    t.position.set(x, y, z); parent.add(t);
  }
}

function buildM5(colorHex) {
  const g = carBase(colorHex);
  const { bodyMaterial: mat, dark, glass, chrome } = g.userData;
  bx(g, 2.00, 0.55, 4.70, mat, 0, 0.72, 0);
  bx(g, 1.92, 0.18, 1.55, mat, 0, 1.02, -1.55);
  bx(g, 1.78, 0.55, 2.05, glass, 0, 1.32, 0.10);
  bx(g, 1.72, 0.06, 1.95, mat, 0, 1.60, 0.10);
  bx(g, 1.92, 0.18, 0.90, mat, 0, 1.02, 1.65);
  for (const x of [-0.35, 0.35]) {
    bx(g, 0.55, 0.42, 0.05, dark, x, 0.72, -2.36);
    const o = bx(g, 0.58, 0.45, 0.02, chrome, x, 0.72, -2.38);
    o.castShadow = false;
  }
  bx(g, 2.00, 0.08, 0.15, dark, 0, 0.45, -2.30);
  for (const x of [-1.0, 1.0]) bx(g, 0.06, 0.20, 3.40, dark, x, 0.50, 0);
  const wheels = addWheels(g, [-1.0, 1.0], [-1.55, 1.50], 0.42, dark, chrome);
  addHeadlights(g, [-0.70, 0.70], 0.85, -2.36, 0.55);
  addTaillights(g, [-0.70, 0.70], 0.85, 2.36, 0.55);
  for (const x of [-0.60, 0.60]) {
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.15, 8), chrome);
    ex.rotation.x = Math.PI / 2; ex.position.set(x, 0.40, 2.34); g.add(ex);
  }
  for (const sx of [-1, 1]) bx(g, 0.20, 0.10, 0.28, mat, sx * 1.05, 1.30, -0.30);
  g.userData.wheels = wheels;
  return g;
}

function buildM4(colorHex) {
  const g = carBase(colorHex);
  const { bodyMaterial: mat, dark, glass, chrome } = g.userData;
  bx(g, 2.02, 0.50, 4.55, mat, 0, 0.68, 0);
  bx(g, 1.94, 0.16, 1.65, mat, 0, 0.95, -1.40);
  bx(g, 1.72, 0.42, 1.35, glass, 0, 1.20, 0.30);
  bx(g, 1.55, 0.30, 0.85, glass, 0, 1.05, 1.05);
  bx(g, 1.48, 0.06, 1.30, mat, 0, 1.42, 0.30);
  bx(g, 1.35, 0.05, 0.75, mat, 0, 1.20, 1.05);
  bx(g, 1.92, 0.15, 1.00, mat, 0, 0.96, 1.70);
  for (const x of [-0.36, 0.36]) {
    bx(g, 0.52, 0.38, 0.05, dark, x, 0.68, -2.28);
    const o = bx(g, 0.55, 0.41, 0.02, chrome, x, 0.68, -2.30);
    o.castShadow = false;
  }
  bx(g, 2.02, 0.08, 0.18, dark, 0, 0.42, -2.24);
  for (const x of [-1.02, 1.02]) bx(g, 0.08, 0.22, 3.30, dark, x, 0.48, 0);
  bx(g, 1.55, 0.06, 0.25, dark, 0, 1.10, 2.18);
  const wheels = addWheels(g, [-1.02, 1.02], [-1.55, 1.45], 0.44, dark, chrome);
  addHeadlights(g, [-0.72, 0.72], 0.80, -2.28, 0.55);
  addTaillights(g, [-0.72, 0.72], 0.85, 2.28, 0.55);
  for (const x of [-0.65, 0.65]) {
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.15, 8), chrome);
    ex.rotation.x = Math.PI / 2; ex.position.set(x, 0.40, 2.26); g.add(ex);
  }
  g.userData.wheels = wheels;
  return g;
}

function buildMuscle(colorHex) {
  const g = carBase(colorHex);
  const { bodyMaterial: mat, dark, chrome } = g.userData;
  const glass = g.userData.glass;
  bx(g, 2.15, 0.60, 4.80, mat, 0, 0.74, 0);
  bx(g, 2.05, 0.16, 2.00, mat, 0, 1.06, -1.40);
  bx(g, 0.90, 0.18, 0.90, dark, 0, 1.20, -1.35);
  bx(g, 1.80, 0.55, 1.70, glass, 0, 1.34, 0.35);
  bx(g, 1.72, 0.06, 1.60, mat, 0, 1.62, 0.35);
  bx(g, 2.00, 0.16, 0.85, mat, 0, 1.06, 1.80);
  bx(g, 1.80, 0.35, 0.06, dark, 0, 0.75, -2.42);
  bx(g, 2.10, 0.10, 0.18, dark, 0, 0.45, -2.38);
  for (const x of [-1.07, 1.07]) bx(g, 0.08, 0.22, 3.40, dark, x, 0.50, 0);
  bx(g, 1.70, 0.05, 0.30, dark, 0, 1.15, 2.32);
  const wheels = addWheels(g, [-1.08, 1.08], [-1.60, 1.55], 0.47, dark, chrome);
  addHeadlights(g, [-0.75, 0.75], 0.85, -2.42, 0.55);
  addTaillights(g, [-0.75, 0.75], 0.90, 2.42, 0.60);
  for (const x of [-0.70, 0.70]) {
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 8), chrome);
    ex.rotation.x = Math.PI / 2; ex.position.set(x, 0.42, 2.40); g.add(ex);
  }
  g.userData.wheels = wheels;
  return g;
}

function buildSUV(colorHex) {
  const g = carBase(colorHex);
  const { bodyMaterial: mat, dark, chrome, glass } = g.userData;
  bx(g, 2.00, 1.05, 4.55, mat, 0, 1.20, 0);
  bx(g, 1.90, 0.55, 1.30, glass, 0, 1.95, -0.30);
  bx(g, 1.95, 0.08, 1.30, mat, 0, 2.25, -0.30);
  bx(g, 1.95, 0.08, 1.45, mat, 0, 2.25, 1.10);
  bx(g, 2.00, 0.55, 1.45, mat, 0, 1.95, 1.10);
  for (const x of [-0.85, 0.85]) bx(g, 0.10, 0.10, 2.80, dark, x, 2.34, 0.35);
  bx(g, 1.95, 0.15, 1.20, mat, 0, 1.75, -1.60);
  bx(g, 1.60, 0.50, 0.06, dark, 0, 1.35, -2.32);
  addHeadlights(g, [-0.70, 0.70], 1.55, -2.32, 0.45);
  addTaillights(g, [-0.85, 0.85], 1.55, 2.30, 0.35);
  const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 20), dark);
  spare.rotation.x = Math.PI / 2; spare.position.set(0, 1.45, 2.42); g.add(spare);
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 20), mat);
  cover.rotation.x = Math.PI / 2; cover.position.set(0, 1.45, 2.56); g.add(cover);
  for (const x of [-1.05, 1.05]) bx(g, 0.14, 0.10, 3.20, dark, x, 0.62, 0);
  const wheels = addWheels(g, [-1.02, 1.02], [-1.55, 1.50], 0.55, dark, chrome);
  g.userData.wheels = wheels;
  return g;
}

function buildLamborghini(colorHex) {
  const g = carBase(colorHex);
  const { bodyMaterial: mat, dark, chrome, glass } = g.userData;
  bx(g, 2.05, 0.42, 4.65, mat, 0, 0.58, 0);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.90, 0.10, 1.55), mat);
  hood.position.set(0, 0.90, -1.55); hood.rotation.x = -0.16; hood.castShadow = true;
  g.add(hood);
  bx(g, 1.55, 0.42, 1.55, glass, 0, 1.02, 0.20);
  bx(g, 1.48, 0.05, 1.45, mat, 0, 1.24, 0.20);
  bx(g, 1.95, 0.20, 1.30, mat, 0, 0.85, 1.55);
  bx(g, 0.10, 0.40, 0.30, dark, -0.75, 1.15, 2.05);
  bx(g, 0.10, 0.40, 0.30, dark,  0.75, 1.15, 2.05);
  bx(g, 2.05, 0.08, 0.55, dark, 0, 1.40, 2.10);
  bx(g, 1.90, 0.20, 0.40, dark, 0, 0.40, 2.32);
  for (let i = -2; i <= 2; i++) bx(g, 0.08, 0.28, 0.35, chrome, i * 0.35, 0.32, 2.35);
  for (const x of [-1.05, 1.05]) bx(g, 0.10, 0.20, 3.50, dark, x, 0.42, 0);
  bx(g, 2.00, 0.08, 0.20, dark, 0, 0.35, -2.35);
  for (const sx of [-1, 1]) {
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.55), mat);
    nose.position.set(sx * 0.55, 0.72, -2.05);
    nose.rotation.z = -sx * 0.15;
    nose.castShadow = true;
    g.add(nose);
  }
  const wheels = addWheels(g, [-1.05, 1.05], [-1.65, 1.55], 0.42, dark, chrome);
  addHeadlights(g, [-0.75, 0.75], 0.78, -2.36, 0.45);
  addTaillights(g, [-0.80, 0.80], 0.85, 2.36, 0.50);
  for (const x of [-0.50, 0.50]) {
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.20, 6), chrome);
    ex.rotation.x = Math.PI / 2; ex.position.set(x, 0.50, 2.38); g.add(ex);
  }
  g.userData.wheels = wheels;
  return g;
}

function buildJesko(colorHex) {
  const g = carBase(colorHex);
  const { bodyMaterial: mat, dark, chrome, glass } = g.userData;
  bx(g, 2.15, 0.38, 4.85, mat, 0, 0.55, 0);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.10, 1.75), mat);
  hood.position.set(0, 0.86, -1.55); hood.rotation.x = -0.13; hood.castShadow = true;
  g.add(hood);
  bx(g, 1.45, 0.38, 1.45, glass, 0, 0.98, 0.15);
  bx(g, 1.38, 0.05, 1.35, mat, 0, 1.19, 0.15);
  bx(g, 2.05, 0.15, 1.35, mat, 0, 0.80, 1.60);
  bx(g, 0.10, 0.65, 1.30, dark, 0, 1.25, 1.65);
  for (const x of [-0.65, 0.65]) bx(g, 0.12, 0.85, 0.20, dark, x, 1.55, 2.10);
  bx(g, 2.20, 0.10, 0.65, dark, 0, 2.00, 2.15);
  bx(g, 2.00, 0.06, 0.30, dark, 0, 1.65, 2.05);
  bx(g, 2.00, 0.30, 0.55, dark, 0, 0.38, 2.42);
  for (let i = -3; i <= 3; i++) bx(g, 0.07, 0.36, 0.45, chrome, i * 0.28, 0.30, 2.42);
  for (const x of [-1.10, 1.10]) bx(g, 0.12, 0.22, 3.60, dark, x, 0.40, 0);
  bx(g, 2.10, 0.10, 0.28, dark, 0, 0.32, -2.42);
  for (const sx of [-1, 1]) for (const z of [-1.5, -1.9]) bx(g, 0.35, 0.06, 0.22, dark, sx * 0.95, 0.65, z);
  for (const x of [-1.08, 1.08]) bx(g, 0.06, 0.30, 0.85, glass, x, 0.85, -0.10);
  for (const x of [-0.75, 0.75]) bx(g, 0.30, 0.05, 0.90, chrome, x, 0.55, -1.30);
  const wheels = addWheels(g, [-1.08, 1.08], [-1.70, 1.65], 0.40, dark, chrome);
  addHeadlights(g, [-0.78, 0.78], 0.72, -2.46, 0.50);
  addTaillights(g, [-0.85, 0.85], 0.85, 2.46, 0.55);
  const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.22, 8), chrome);
  ex.rotation.x = Math.PI / 2; ex.position.set(0, 0.55, 2.50); g.add(ex);
  g.userData.wheels = wheels;
  return g;
}

const BUILDERS = {
  m5: buildM5, m4: buildM4, muscle: buildMuscle,
  suv: buildSUV, lambo: buildLamborghini, jesko: buildJesko,
};

export function makeCar(classId, colorHex, opts = {}) {
  const cls = getCarClass(classId);
  const g = (BUILDERS[cls.id] || buildM5)(colorHex);
  g.userData.classId = cls.id;
  if (opts.headlight) {
    const spot = new THREE.SpotLight(0xfff0d0, 10, 45, 0.45, 0.6, 1.2);
    spot.position.set(0, 1, -2);
    spot.target.position.set(0, 0, -25);
    g.add(spot, spot.target);
  }
  return g;
}
