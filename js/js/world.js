import * as THREE from 'three';
import {
  STREETS, STREET_WIDTH, SIDEWALK, BLOCK_SIZE, BLOCK_CENTERS,
  PARK_BLOCKS, WORLD_HALF, HWY_Y, HWY_W, HWY_HALF, RAMPS, PLATFORMS,
} from './config.js';
import {
  makeAsphaltTex, makeSidewalkTex, makeGlassTex, makeOfficeTex,
  makeResiTex, makeArtDecoTex, makeStorefrontTex, makeLobbyTex, makeBillboardTex,
} from './textures.js';
import { refs } from './state.js';

export function buildWorld(scene) {
  const groundTex = makeAsphaltTex(); groundTex.repeat.set(70, 70);
  {
    const g = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD_HALF * 2.6, WORLD_HALF * 2.6),
      new THREE.MeshStandardMaterial({ color: 0x2a2a30, map: groundTex, roughness: 0.96 })
    );
    g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g);
  }

  const ASPHALT_TEX = makeAsphaltTex();
  const SIDEWALK_TEX = makeSidewalkTex();
  const GLASS_TEX = makeGlassTex();
  const OFFICE_TEX = makeOfficeTex();
  const RESI_TEX = makeResiTex();
  const ART_DECO_TEX = makeArtDecoTex();
  const STORE_TEX = makeStorefrontTex();
  const LOBBY_TEX = makeLobbyTex();

  ASPHALT_TEX.repeat.set(2, 20);
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x232326, map: ASPHALT_TEX, roughness: 0.9 });
  const streetLen = (STREETS[STREETS.length - 1] - STREETS[0]) + STREET_WIDTH + 240;
  function addStreet(x, z, w, h) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), asphaltMat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); m.receiveShadow = true; scene.add(m);
  }
  for (const s of STREETS) {
    addStreet(s, 0, STREET_WIDTH, streetLen);
    addStreet(0, s, streetLen, STREET_WIDTH);
  }

  const lineY = new THREE.MeshBasicMaterial({ color: 0xffcc22 });
  const lineW = new THREE.MeshBasicMaterial({ color: 0xdddddd });
  function addLine(x, z, w, h, m = lineY) {
    const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    o.rotation.x = -Math.PI / 2; o.position.set(x, 0.035, z); scene.add(o);
  }
  for (const s of STREETS) {
    addLine(s - 0.5, 0, 0.35, streetLen); addLine(s + 0.5, 0, 0.35, streetLen);
    addLine(0, s - 0.5, streetLen, 0.35); addLine(0, s + 0.5, streetLen, 0.35);
    for (let p = -260; p <= 260; p += 16) {
      addLine(s - STREET_WIDTH/4, p, 0.4, 6, lineW); addLine(s + STREET_WIDTH/4, p, 0.4, 6, lineW);
      addLine(p, s - STREET_WIDTH/4, 6, 0.4, lineW); addLine(p, s + STREET_WIDTH/4, 6, 0.4, lineW);
    }
  }

  // Crosswalks
  const cwMat = new THREE.MeshBasicMaterial({ color: 0xf0f0f0 });
  const cwGeo = new THREE.PlaneGeometry(0.9, 2.4);
  for (const sx of STREETS) for (const sz of STREETS) {
    for (let i = -3; i <= 3; i++) {
      const c1 = new THREE.Mesh(cwGeo, cwMat); c1.rotation.x = -Math.PI / 2;
      c1.position.set(sx + i * 2.4, 0.04, sz - STREET_WIDTH/2 - 2); scene.add(c1);
      const c2 = c1.clone(); c2.position.z = sz + STREET_WIDTH/2 + 2; scene.add(c2);
      const c3 = new THREE.Mesh(cwGeo, cwMat); c3.rotation.x = -Math.PI / 2; c3.rotation.z = Math.PI / 2;
      c3.position.set(sx - STREET_WIDTH/2 - 2, 0.04, sz + i * 2.4); scene.add(c3);
      const c4 = c3.clone(); c4.position.x = sx + STREET_WIDTH/2 + 2; scene.add(c4);
    }
  }

  // Sidewalks
  SIDEWALK_TEX.repeat.set(8, 8);
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x909098, map: SIDEWALK_TEX, roughness: 0.95 });
  for (const bx of BLOCK_CENTERS) for (const bz of BLOCK_CENTERS) {
    const w = BLOCK_SIZE + SIDEWALK * 2;
    const walk = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, w), sidewalkMat);
    walk.position.set(bx, 0.15, bz); walk.receiveShadow = true; scene.add(walk);
  }

  // Buildings
  buildBuildings(scene, { GLASS_TEX, OFFICE_TEX, RESI_TEX, ART_DECO_TEX, STORE_TEX, LOBBY_TEX });

  // Lamps
  buildLamps(scene);

  // Trees
  buildTrees(scene);

  // Highway
  buildHighway(scene);

  // Ramps
  buildRamps(scene);
}

// ============================================================
//  BUILDINGS
// ============================================================
function buildBuildings(scene, TEX) {
  const ROOF_MAT = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.9 });
  const ROOF_DETAIL_MAT = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.85 });
  const ANTENNA_MAT = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.4 });
  const AC_MAT = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.7, metalness: 0.3 });
  const WATER_TANK_MAT = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.85, metalness: 0.1 });
  const CONCRETE_MAT = new THREE.MeshStandardMaterial({ color: 0x9a9a9e, roughness: 0.92 });
  const DARK_CONCRETE_MAT = new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.9 });
  const MARBLE_MAT = new THREE.MeshStandardMaterial({ color: 0xd4c8a8, roughness: 0.45, metalness: 0.1 });
  const COLUMN_MAT = new THREE.MeshStandardMaterial({ color: 0xc8c4b0, roughness: 0.6 });
  const HELIPAD_MAT = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  const HELI_H_MAT = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
  const BEACON_MAT = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  const EDGE_MAT = new THREE.MeshStandardMaterial({ color: 0x0d0f16, roughness: 0.9, metalness: 0.3 });

  let seed = 9137;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

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
      envMapIntensity: 0.6,
    });
    refs.windowMats.push(m);
    return m;
  }
  function addBox(g, w, h, d, mat, x, y, z, castShadow = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = castShadow; m.receiveShadow = true; g.add(m);
    return m;
  }
  function addCornerStrip(g, w, h, d, mat) {
    const th = 0.6;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(th, h, th), mat);
      s.position.set(sx * (w/2 - th/2 - 0.05), h/2, sz * (d/2 - th/2 - 0.05));
      s.castShadow = true;
      g.add(s);
    }
  }
  function addPodiumBase(g, w, d, h) {
    addBox(g, w, h, d, DARK_CONCRETE_MAT, 0, h/2, 0);
    const storefront = matFromTex(TEX.STORE_TEX, Math.max(2, Math.round(w/6)), 1, {
      emissive: 1.7, roughness: 0.35, metalness: 0.3,
    });
    addBox(g, w + 0.2, 3.2, d + 0.2, storefront, 0, 1.9, 0);
    const canopy = new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 0.6, metalness: 0.4 });
    addBox(g, w + 1.2, 0.4, d + 1.2, canopy, 0, 3.7, 0, false);
    const lobby = matFromTex(TEX.LOBBY_TEX, 1, 1, { emissive: 1.8, roughness: 0.1, metalness: 0.1 });
    const lp = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), lobby);
    lp.position.set(0, 1.6, d/2 + 0.15);
    g.add(lp);
    for (const sx of [-1, 1]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(1.2, h, 0.6), COLUMN_MAT);
      col.position.set(sx * (w/2 - 1.2), h/2, d/2 + 0.1);
      col.castShadow = true;
      g.add(col);
    }
  }
  function addRoofAC(g, w, d, y) {
    const n = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(2 + rnd()*2, 1.2 + rnd()*0.8, 2 + rnd()*2), AC_MAT);
      ac.position.set((rnd()-0.5)*w*0.55, y + 0.9, (rnd()-0.5)*d*0.55);
      ac.castShadow = true;
      g.add(ac);
    }
  }
  function addRoofWaterTank(g, y) {
    const legH = 2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, legH, 4), ANTENNA_MAT);
      leg.position.set(sx * 1.5, y + legH/2, sz * 1.5);
      g.add(leg);
    }
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 3.5, 12), WATER_TANK_MAT);
    tank.position.y = y + legH + 1.75; tank.castShadow = true; g.add(tank);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.2, 12), WATER_TANK_MAT);
    cap.position.y = y + legH + 4.1; g.add(cap);
  }
  function addRoofAntenna(g, y, big) {
    const h = big ? 14 + rnd()*8 : 6 + rnd()*5;
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, h, 6), ANTENNA_MAT);
    ant.position.y = y + h/2; g.add(ant);
    const bc = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), BEACON_MAT);
    bc.position.y = y + h; g.add(bc);
  }
  function addRoofShed(g, w, d, y) {
    const sw = Math.min(6, w*0.4), sd = Math.min(6, d*0.4);
    addBox(g, sw, 3, sd, ROOF_DETAIL_MAT, sw*0.15, y + 1.5, sd*0.15);
  }
  function addHelipad(g, y, r) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.35, 28), HELIPAD_MAT);
    pad.position.y = y + 0.9; g.add(pad);
    const hBar = new THREE.BoxGeometry(0.4, 0.25, r*0.9);
    const cb = new THREE.BoxGeometry(r*0.9, 0.25, 0.4);
    const hw = r * 0.3;
    for (const sx of [-1, 1]) {
      const b = new THREE.Mesh(hBar, HELI_H_MAT);
      b.position.set(sx*hw, y + 1.15, 0); g.add(b);
    }
    const cbb = new THREE.Mesh(cb, HELI_H_MAT);
    cbb.position.set(0, y + 1.15, 0); g.add(cbb);
  }
  function addBillboard(g, w, d, y) {
    const words = ['APEX','NOVA','VICE','CITY','NEON','EXPO','ELITE','ROCK','RIDE'];
    const hues = [200,320,20,280,160,40];
    const t = makeBillboardTex(words[Math.floor(rnd()*words.length)], hues[Math.floor(rnd()*hues.length)]);
    const bm = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    refs.signMats.push(bm);
    const bbW = Math.min(w*0.9, 12), bbH = bbW*0.5;
    const frame = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6, metalness: 0.5 });
    const fm1 = new THREE.Mesh(new THREE.BoxGeometry(bbW+0.4, bbH+0.4, 0.3), frame);
    fm1.position.set(0, y + bbH/2, -d/2 - 0.3); g.add(fm1);
    const bb = new THREE.Mesh(new THREE.PlaneGeometry(bbW, bbH), bm);
    bb.position.set(0, y + bbH/2, -d/2 - 0.5); g.add(bb);
    const fm2 = fm1.clone();
    fm2.position.z = d/2 + 0.3; g.add(fm2);
    const bk = new THREE.Mesh(new THREE.PlaneGeometry(bbW, bbH), bm);
    bk.position.set(0, y + bbH/2, d/2 + 0.5);
    bk.rotation.y = Math.PI; g.add(bk);
  }

  function buildSkyscraper(g, w, d, h) {
    const podH = 8;
    addPodiumBase(g, w*1.15, d*1.15, podH);
    let y = podH, tw = w, td = d, th = h - podH;
    const tiers = 3 + (rnd() < 0.5 ? 1 : 0);
    for (let i = 0; i < tiers; i++) {
      const frac = 1 / (tiers - i);
      const tierH = Math.max(6, th * frac * (0.55 + rnd()*0.3));
      const shrink = i === 0 ? 1 : 1 - (0.15 + rnd()*0.12);
      tw *= shrink; td *= shrink;
      const tm = matFromTex(TEX.GLASS_TEX, Math.max(1, Math.round(tw/4)), Math.max(2, Math.round(tierH/4)), {
        emissive: 1.05, roughness: 0.15, metalness: 0.7, color: 0xa8c0e0,
      });
      addBox(g, tw, tierH, td, tm, 0, y + tierH/2, 0);
      addCornerStrip(g, tw, tierH, td, EDGE_MAT);
      if (i < tiers - 1) {
        const ledge = new THREE.Mesh(new THREE.BoxGeometry(tw+0.6, 0.5, td+0.6), EDGE_MAT);
        ledge.position.y = y + tierH + 0.2;
        g.add(ledge);
      }
      y += tierH; th -= tierH;
      if (th < 6) break;
    }
    const crown = new THREE.Mesh(new THREE.BoxGeometry(tw+0.6, 0.8, td+0.6), EDGE_MAT);
    crown.position.y = y + 0.4; g.add(crown); y += 0.8;
    if (rnd() < 0.4) addHelipad(g, y, Math.min(tw, td) * 0.35);
    addRoofAntenna(g, y, rnd() < 0.7);
    if (rnd() < 0.5) addBillboard(g, tw, td, y + 1);
  }
  function buildOffice(g, w, d, h) {
    const podH = 6;
    addPodiumBase(g, w*1.1, d*1.1, podH);
    let y = podH, tw = w, td = d, th = h - podH;
    for (let i = 0; i < 2; i++) {
      const frac = 1 / (2 - i);
      const tierH = i === 1 ? th : th * frac * (0.6 + rnd()*0.2);
      if (i > 0) { tw *= 0.78; td *= 0.78; }
      const tm = matFromTex(TEX.OFFICE_TEX, Math.max(1, Math.round(tw/5)), Math.max(1, Math.round(tierH/5)), {
        emissive: 1.15, roughness: 0.78, metalness: 0.12, color: 0xc0c4d0,
      });
      addBox(g, tw, tierH, td, tm, 0, y + tierH/2, 0);
      addCornerStrip(g, tw, tierH, td, DARK_CONCRETE_MAT);
      if (i < 1) {
        const ledge = new THREE.Mesh(new THREE.BoxGeometry(tw+0.6, 0.5, td+0.6), DARK_CONCRETE_MAT);
        ledge.position.y = y + tierH + 0.25;
        g.add(ledge);
      }
      y += tierH; th -= tierH;
      if (th < 5) break;
    }
    const crown = new THREE.Mesh(new THREE.BoxGeometry(tw+0.4, 0.7, td+0.4), DARK_CONCRETE_MAT);
    crown.position.y = y + 0.35; g.add(crown); y += 0.7;
    addRoofAC(g, tw, td, y);
    if (rnd() < 0.4) addRoofShed(g, tw, td, y);
    if (rnd() < 0.55) addRoofAntenna(g, y, false);
    if (rnd() < 0.35) addRoofWaterTank(g, y);
    if (rnd() < 0.3) addBillboard(g, tw, td, y + 1);
  }
  function buildArtDeco(g, w, d, h) {
    const podH = 7;
    addPodiumBase(g, w*1.15, d*1.15, podH);
    let y = podH, tw = w, td = d, th = h - podH;
    for (let i = 0; i < 3; i++) {
      const tierH = i === 2 ? th : th * 0.42;
      if (i > 0) { tw *= 0.72; td *= 0.72; }
      const tm = matFromTex(TEX.ART_DECO_TEX, Math.max(1, Math.round(tw/5)), Math.max(1, Math.round(tierH/5)), {
        emissive: 1.05, roughness: 0.68, metalness: 0.1, color: 0xd4c8a8,
      });
      addBox(g, tw, tierH, td, tm, 0, y + tierH/2, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(1.2, tierH, 0.6), MARBLE_MAT);
        strip.position.set(sx*(tw/2 - 0.6), y + tierH/2, sz*(td/2 + 0.05));
        g.add(strip);
      }
      y += tierH; th -= tierH;
      if (th < 5) break;
    }
    const crownH = 6 + rnd()*6;
    const cm = matFromTex(TEX.ART_DECO_TEX, 1, 2, { emissive: 0.8, roughness: 0.7, color: 0xe0d0a8 });
    addBox(g, tw*0.6, crownH, td*0.6, cm, 0, y + crownH/2, 0);
    y += crownH;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.2, 6, 8), MARBLE_MAT);
    spire.position.y = y + 3; g.add(spire);
    const bc = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), BEACON_MAT);
    bc.position.y = y + 6.5; g.add(bc);
  }
  function buildResidential(g, w, d, h) {
    const podH = 4;
    addPodiumBase(g, w*1.05, d*1.05, podH);
    const y = podH;
    const bodyH = h - podH;
    const bm = matFromTex(TEX.RESI_TEX, Math.max(1, Math.round(w/5)), Math.max(1, Math.round(bodyH/5)), {
      emissive: 1.0, roughness: 0.88, metalness: 0.05, color: 0xc0a890,
    });
    addBox(g, w, bodyH, d, bm, 0, y + bodyH/2, 0);
    addCornerStrip(g, w, bodyH, d, DARK_CONCRETE_MAT);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w+0.4, 0.5, d+0.4), ROOF_MAT);
    slab.position.y = y + bodyH + 0.25; g.add(slab);
    const roofY = y + bodyH + 0.5;
    addRoofShed(g, w, d, roofY);
    if (rnd() < 0.6) addRoofWaterTank(g, roofY);
    addRoofAC(g, w, d, roofY);
    const nb = 3 + Math.floor(rnd()*3);
    const bh = bodyH / (nb + 1);
    for (let i = 0; i < nb; i++) {
      const balc = new THREE.Mesh(new THREE.BoxGeometry(w*0.85, 0.3, 1.6), CONCRETE_MAT);
      balc.position.set(0, y + bh*(i+1), d/2 + 0.8);
      balc.castShadow = true;
      g.add(balc);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(w*0.85, 0.9, 0.1), DARK_CONCRETE_MAT);
      rail.position.set(0, y + bh*(i+1) + 0.6, d/2 + 1.55);
      g.add(rail);
    }
  }
  function buildCommercial(g, w, d, h) {
    const bm = matFromTex(TEX.OFFICE_TEX, Math.max(1, Math.round(w/5)), Math.max(1, Math.round(h/5)), {
      emissive: 1.05, roughness: 0.75, metalness: 0.12, color: 0xb8bcc8,
    });
    addBox(g, w, h, d, bm, 0, h/2, 0);
    addCornerStrip(g, w, h, d, DARK_CONCRETE_MAT);
    const storefront = matFromTex(TEX.STORE_TEX, Math.max(2, Math.round(w/6)), 1, {
      emissive: 1.7, roughness: 0.35, metalness: 0.3,
    });
    addBox(g, w + 0.2, 4, d + 0.2, storefront, 0, 2.2, 0);
    const canopy = new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 0.6, metalness: 0.4 });
    addBox(g, w + 1.6, 0.4, d + 1.6, canopy, 0, 4.3, 0, false);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w+0.4, 0.5, d+0.4), ROOF_MAT);
    slab.position.y = h + 0.25; g.add(slab);
    addRoofAC(g, w, d, h + 0.5);
    if (rnd() < 0.6) addBillboard(g, w, d, h + 1);
  }
  function buildLowrise(g, w, d, h) {
    const bm = matFromTex(TEX.RESI_TEX, Math.max(1, Math.round(w/4)), Math.max(1, Math.round(h/4)), {
      emissive: 1.0, roughness: 0.88, metalness: 0.05, color: 0xb0a898,
    });
    addBox(g, w, h, d, bm, 0, h/2, 0);
    addCornerStrip(g, w, h, d, DARK_CONCRETE_MAT);
    const storefront = matFromTex(TEX.STORE_TEX, Math.max(1, Math.round(w/6)), 1, {
      emissive: 1.6, roughness: 0.4, metalness: 0.3,
    });
    addBox(g, w + 0.2, 3, d + 0.2, storefront, 0, 1.7, 0);
    const awning = new THREE.Mesh(new THREE.BoxGeometry(w+1, 0.3, d+1), new THREE.MeshStandardMaterial({
      color: [0xdd3322,0x2c7cff,0x38f7c0,0xffbf35][Math.floor(rnd()*4)], roughness: 0.7,
    }));
    awning.position.y = 3.4; g.add(awning);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w+0.4, 0.4, d+0.4), ROOF_MAT);
    slab.position.y = h + 0.2; g.add(slab);
    addRoofAC(g, w, d, h + 0.4);
  }

  function pickType(h, distC) {
    const r = rnd();
    const tallness = h / 130;
    if (distC < 110) {
      if (tallness > 0.6) return r < 0.55 ? 'skyscraper' : (r < 0.8 ? 'skyscraper' : 'artdeco');
      if (tallness > 0.35) return r < 0.35 ? 'skyscraper' : (r < 0.6 ? 'office' : (r < 0.8 ? 'artdeco' : 'brutalist'));
      return r < 0.3 ? 'office' : (r < 0.55 ? 'residential' : (r < 0.8 ? 'commercial' : 'brutalist'));
    } else if (distC < 180) {
      if (tallness > 0.5) return r < 0.4 ? 'office' : (r < 0.7 ? 'residential' : 'artdeco');
      if (tallness > 0.3) return r < 0.35 ? 'residential' : (r < 0.7 ? 'office' : 'commercial');
      return r < 0.5 ? 'residential' : (r < 0.8 ? 'commercial' : 'lowrise');
    } else {
      if (tallness > 0.4) return r < 0.5 ? 'residential' : 'commercial';
      return r < 0.4 ? 'lowrise' : (r < 0.75 ? 'residential' : 'commercial');
    }
  }

  for (const bx of BLOCK_CENTERS) for (const bz of BLOCK_CENTERS) {
    if (PARK_BLOCKS.has(`${bx},${bz}`)) continue;
    const distC = Math.hypot(bx, bz);
    const t = Math.min(1, distC / 240);
    const maxH = THREE.MathUtils.lerp(140, 22, t);
    const count = 1 + Math.floor(rnd() * 3);
    const placed = [];
    for (let i = 0; i < count; i++) {
      const w = 16 + rnd()*18, d = 16 + rnd()*18, h = 12 + rnd()*maxH;
      const half = BLOCK_SIZE/2 - Math.max(w,d)/2 - 2;
      const ox = (rnd()*2 - 1) * Math.max(2, half - 4);
      const oz = (rnd()*2 - 1) * Math.max(2, half - 4);
      let ok = true;
      for (const p of placed) if (Math.hypot(p.x - ox, p.z - oz) < (p.s + Math.max(w,d))/2 + 2) { ok = false; break; }
      if (!ok) continue;
      placed.push({ x: ox, z: oz, s: Math.max(w,d) });

      const type = pickType(h, distC);
      const g = new THREE.Group();
      g.position.set(bx + ox, 0, bz + oz);
      g.rotation.y = (rnd() < 0.5 ? 0 : Math.PI/2) * (rnd() < 0.3 ? -1 : 1);

      switch (type) {
        case 'skyscraper': buildSkyscraper(g, w, d, Math.max(h, 80)); break;
        case 'artdeco': buildArtDeco(g, w, d, Math.max(h, 55)); break;
        case 'brutalist': buildSkyscraper(g, w, d, Math.max(h, 50)); break;  // fallback
        case 'office': buildOffice(g, w, d, Math.max(h, 30)); break;
        case 'residential': buildResidential(g, w, d, Math.max(h, 20)); break;
        case 'commercial': buildCommercial(g, w, d, Math.max(h, 12)); break;
        case 'lowrise': default: buildLowrise(g, w, d, Math.max(h, 10)); break;
      }
      scene.add(g);
    }
  }
}

// ============================================================
//  LAMPS
// ============================================================
function buildLamps(scene) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.5, metalness: 0.7 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0x333338, emissive: 0xffe6b0, emissiveIntensity: 0.6 });
  refs.lampMats.push(headMat);

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
  const poleIM = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.14, 0.18, 7, 6), poleMat, positions.length
  );
  const headIM = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.55, 10, 8), headMat, positions.length
  );
  const dm = new THREE.Object3D();
  for (let i = 0; i < positions.length; i++) {
    const [x, z, y] = positions[i];
    const b = y ?? 0;
    dm.position.set(x, b + 3.5, z); dm.updateMatrix(); poleIM.setMatrixAt(i, dm.matrix);
    dm.position.set(x, b + 7.3, z); dm.updateMatrix(); headIM.setMatrixAt(i, dm.matrix);
  }
  poleIM.instanceMatrix.needsUpdate = true;
  headIM.instanceMatrix.needsUpdate = true;
  poleIM.castShadow = true;
  scene.add(poleIM, headIM);

  // Glow sprites
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x2 = c.getContext('2d');
  const g = x2.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,230,176,1)');
  g.addColorStop(0.4, 'rgba(255,200,120,0.4)');
  g.addColorStop(1, 'rgba(255,180,80,0)');
  x2.fillStyle = g; x2.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const grp = new THREE.Group();
  for (const [x, z, y] of positions) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    sp.scale.set(6, 6, 1);
    sp.position.set(x, (y ?? 0) + 7.3, z);
    grp.add(sp);
  }
  scene.add(grp);
  refs.lampGlow = { grp, opacity: 0.8 };
}

// ============================================================
//  TREES
// ============================================================
function buildTrees(scene) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3224, roughness: 0.95 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a5a3a, roughness: 0.9 });
  const transforms = [];
  let seed = 4423;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (const key of PARK_BLOCKS) {
    const [bx, bz] = key.split(',').map(Number);
    const n = 6 + Math.floor(rnd() * 6);
    for (let i = 0; i < n; i++) {
      transforms.push([
        bx + (rnd()*2 - 1) * (BLOCK_SIZE/2 - 6),
        bz + (rnd()*2 - 1) * (BLOCK_SIZE/2 - 6),
        0.8 + rnd() * 0.6,
      ]);
    }
  }
  const trunkIM = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.4, 0.55, 3, 6), trunkMat, transforms.length
  );
  const leafIM = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(2.6, 1), leafMat, transforms.length
  );
  const dm = new THREE.Object3D();
  for (let i = 0; i < transforms.length; i++) {
    const [x, z, s] = transforms[i];
    dm.position.set(x, 1.5*s + 0.3, z);
    dm.scale.setScalar(s);
    dm.rotation.y = rnd() * Math.PI * 2;
    dm.updateMatrix();
    trunkIM.setMatrixAt(i, dm.matrix);
    dm.position.set(x, 4.2*s + 0.3, z);
    dm.updateMatrix();
    leafIM.setMatrixAt(i, dm.matrix);
    dm.scale.setScalar(1); dm.rotation.set(0, 0, 0);
  }
  trunkIM.instanceMatrix.needsUpdate = true;
  leafIM.instanceMatrix.needsUpdate = true;
  trunkIM.castShadow = true;
  leafIM.castShadow = true;
  scene.add(trunkIM, leafIM);
}

// ============================================================
//  HIGHWAY
// ============================================================
function buildHighway(scene) {
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.88, metalness: 0.05 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c8, roughness: 0.4, metalness: 0.6 });
  const railNeon = new THREE.MeshStandardMaterial({ color: 0x38f7c0, emissive: 0x38f7c0, emissiveIntensity: 1.4 });
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.85, metalness: 0.1 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffdd55 });
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });

  function segment(x, z, w, d) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, d), deckMat);
    deck.position.set(x, HWY_Y - 0.6, z);
    deck.receiveShadow = true; deck.castShadow = true;
    scene.add(deck);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(w, d), deckMat);
    top.rotation.x = -Math.PI/2;
    top.position.set(x, HWY_Y + 0.01, z);
    scene.add(top);
    const railH = 1.1;
    if (d < w) {
      for (const sgn of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(w, railH, 0.35), railMat);
        rail.position.set(x, HWY_Y + railH/2, z + sgn * (d/2 - 0.2));
        rail.castShadow = true; scene.add(rail);
        const neon = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.16), railNeon);
        neon.position.set(x, HWY_Y + railH + 0.02, z + sgn * (d/2 - 0.2));
        scene.add(neon);
      }
      for (const off of [-d/6, d/6]) for (let p = x - w/2 + 6; p < x + w/2 - 4; p += 10) {
        const lm = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.45), lineMat);
        lm.rotation.x = -Math.PI/2;
        lm.position.set(p, HWY_Y + 0.02, z + off);
        scene.add(lm);
      }
      for (const sgn of [-1, 1]) {
        const em = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.25), edgeMat);
        em.rotation.x = -Math.PI/2;
        em.position.set(x, HWY_Y + 0.02, z + sgn * (d/2 - 1.2));
        scene.add(em);
      }
    } else {
      for (const sgn of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, railH, d), railMat);
        rail.position.set(x + sgn * (w/2 - 0.2), HWY_Y + railH/2, z);
        rail.castShadow = true; scene.add(rail);
        const neon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, d), railNeon);
        neon.position.set(x + sgn * (w/2 - 0.2), HWY_Y + railH + 0.02, z);
        scene.add(neon);
      }
      for (const off of [-w/6, w/6]) for (let p = z - d/2 + 6; p < z + d/2 - 4; p += 10) {
        const lm = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 6), lineMat);
        lm.rotation.x = -Math.PI/2;
        lm.position.set(x + off, HWY_Y + 0.02, p);
        scene.add(lm);
      }
      for (const sgn of [-1, 1]) {
        const em = new THREE.Mesh(new THREE.PlaneGeometry(0.25, d), edgeMat);
        em.rotation.x = -Math.PI/2;
        em.position.set(x + sgn * (w/2 - 1.2), HWY_Y + 0.02, z);
        scene.add(em);
      }
    }
  }

  segment(0, -HWY_HALF, HWY_HALF * 2, HWY_W);
  segment(0,  HWY_HALF, HWY_HALF * 2, HWY_W);
  segment( HWY_HALF, 0, HWY_W, HWY_HALF * 2);
  segment(-HWY_HALF, 0, HWY_W, HWY_HALF * 2);

  function pillar(x, z) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, HWY_Y - 1.2, 8), pillarMat);
    p.position.set(x, (HWY_Y - 1.2) / 2, z);
    p.castShadow = true; p.receiveShadow = true;
    scene.add(p);
  }
  for (let p = -240; p <= 240; p += 60) {
    pillar(p, -HWY_HALF); pillar(p, HWY_HALF);
    pillar(-HWY_HALF, p); pillar(HWY_HALF, p);
  }
}

// ============================================================
//  RAMPS
// ============================================================
function buildRamps(scene) {
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
    plate.rotation.x = -ang;
    plate.position.y = r.h / 2;
    plate.castShadow = true; plate.receiveShadow = true;
    g.add(plate);
    const rl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, len), railMat);
    rl.rotation.x = -ang;
    rl.position.set(-r.w/2, r.h/2 + 0.55, 0);
    g.add(rl);
    const rr = rl.clone(); rr.position.x = r.w/2; g.add(rr);
    const st = new THREE.Mesh(new THREE.BoxGeometry(r.w + 0.2, 0.12, 1.2), stripeMat);
    st.position.set(0, r.h + 0.05, r.d/2 - 0.4);
    st.rotation.x = -ang;
    g.add(st);
    for (let i = -1; i <= 1; i += 2) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 6), stripeMat);
      c.position.set(i * (r.w/2 - 1), 0.45, -r.d/2 - 1);
      g.add(c);
    }
    scene.add(g);
  }
}

// ============================================================
//  WORLD-QUERY HELPERS
// ============================================================
export function rampAt(x, z) {
  for (const r of RAMPS) {
    const dx = x - r.x, dz = z - r.z;
    const lx = r._c * dx - r._s * dz;
    const lz = r._s * dx + r._c * dz;
    if (Math.abs(lx) <= r.w/2 && Math.abs(lz) <= r.d/2) return { ramp: r, lx, lz };
  }
  return null;
}

export function groundHeightAt(x, z, currentY) {
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

export function buildCheckpoints(scene) {
  const cpGroup = new THREE.Group();
  scene.add(cpGroup);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffbf35, transparent: true, opacity: 0.92 });
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffe066, transparent: true, opacity: 0.18,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const checkpoints = [];
  for (const r of RAMPS) {
    const cp = {
      x: r.x - r._ax * (r.d/2 + 14),
      y: r.h + 6,
      z: r.z - r._az * (r.d/2 + 14),
    };
    checkpoints.push(cp);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.4, 12, 32), ringMat);
    ring.position.set(cp.x, cp.y, cp.z); cpGroup.add(ring);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(3.8, 28), glowMat);
    glow.position.set(cp.x, cp.y, cp.z); cpGroup.add(glow);
  }
  refs.checkpoints = checkpoints;
  return checkpoints;
}
