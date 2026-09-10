import * as THREE from 'three';

// All canvas-generated textures in one place.

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function makeAsphaltTex() {
  const c = canvas(512, 512);
  const x = c.getContext('2d');
  x.fillStyle = '#17171b'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 24000; i++) {
    const v = (Math.random() - 0.5) * 34;
    x.fillStyle = `rgb(${23+v|0},${23+v|0},${26+v|0})`;
    x.fillRect(Math.random()*512|0, Math.random()*512|0, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeSidewalkTex() {
  const c = canvas(256, 256);
  const x = c.getContext('2d');
  x.fillStyle = '#8a8a92'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) {
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

export function makeGlassTex(w = 512, h = 1024) {
  const c = canvas(w, h);
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.00, '#2e4668');
  g.addColorStop(0.30, '#1c2e4a');
  g.addColorStop(0.60, '#141e32');
  g.addColorStop(1.00, '#0a1220');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  // Reflection streaks
  x.globalCompositeOperation = 'lighter';
  for (let i = -4; i < 14; i++) {
    x.save(); x.translate(i * 70, 0); x.rotate(-0.48);
    const g2 = x.createLinearGradient(0, 0, 26, 0);
    g2.addColorStop(0, 'rgba(140,190,240,0)');
    g2.addColorStop(0.5, 'rgba(140,190,240,0.13)');
    g2.addColorStop(1, 'rgba(140,190,240,0)');
    x.fillStyle = g2; x.fillRect(0, -h, 26, h*2);
    x.restore();
  }
  x.globalCompositeOperation = 'source-over';
  const colW = 20, rowH = 28;
  for (let py = 0; py < h; py += rowH) {
    x.fillStyle = 'rgba(0,0,0,0.75)'; x.fillRect(0, py, w, 3);
    x.fillStyle = 'rgba(180,200,240,0.13)'; x.fillRect(0, py+3, w, 1);
    x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(0, py+rowH-2, w, 2);
  }
  for (let px = 0; px < w; px += colW) {
    x.fillStyle = 'rgba(0,0,0,0.65)'; x.fillRect(px, 0, 2, h);
    x.fillStyle = 'rgba(160,190,240,0.16)'; x.fillRect(px+2, 0, 1, h);
  }
  for (let py = 0; py < h; py += rowH)
    for (let px = 0; px < w; px += colW) {
      if (Math.random() < 0.32) {
        const warm = Math.random() < 0.55;
        const a = 0.35 + Math.random() * 0.42;
        x.fillStyle = warm
          ? `rgba(255,215,155,${a})`
          : `rgba(160,205,255,${a})`;
        x.fillRect(px+3, py+5, colW-5, rowH-9);
        x.fillStyle = 'rgba(255,255,255,0.16)';
        x.fillRect(px+3, py+5, colW-5, 2);
      }
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export function makeOfficeTex(w = 512, h = 512) {
  const c = canvas(w, h);
  const x = c.getContext('2d');
  x.fillStyle = '#1c1e2a'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 14000; i++) {
    const v = Math.random() * 22;
    x.fillStyle = `rgba(${90+v|0},${100+v|0},${125+v|0},0.08)`;
    x.fillRect(Math.random()*w|0, Math.random()*h|0, 1, 1);
  }
  const colW = 34, rowH = 30;
  for (let py = 0; py < h; py += rowH) {
    x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(0, py, w, 3);
    x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(0, py+3, w, 1);
    for (let px = 0; px < w; px += colW) {
      x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(px, py, 3, rowH);
      const lit = Math.random() < 0.40;
      if (lit) {
        const warm = Math.random() < 0.72;
        const a = 0.55 + Math.random() * 0.42;
        x.fillStyle = warm ? `rgba(255,220,155,${a})` : `rgba(160,210,255,${a})`;
      } else {
        x.fillStyle = 'rgba(14,20,32,0.95)';
      }
      x.fillRect(px+4, py+5, colW-6, rowH-10);
      x.fillStyle = 'rgba(255,255,255,0.1)';
      x.fillRect(px+4, py+5, colW-6, 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export function makeResiTex(w = 512, h = 512) {
  const c = canvas(w, h);
  const x = c.getContext('2d');
  x.fillStyle = '#3a2420'; x.fillRect(0, 0, w, h);
  for (let by = 0; by < h; by += 12) for (let bx = 0; bx < w; bx += 26) {
    const v = Math.random() * 30;
    const off = (by / 12) % 2 ? 13 : 0;
    x.fillStyle = `rgb(${60+v|0},${36+v|0},${30+v|0})`;
    x.fillRect(bx + off, by, 24, 10);
  }
  const colW = 34, rowH = 38;
  for (let py = 0; py < h; py += rowH) {
    x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, py, w, 3);
    for (let px = 0; px < w; px += colW) {
      const lit = Math.random() < 0.5;
      if (lit) {
        const warm = Math.random() < 0.85;
        const a = 0.55 + Math.random() * 0.42;
        x.fillStyle = warm ? `rgba(255,205,145,${a})` : `rgba(180,215,255,${a})`;
      } else {
        x.fillStyle = 'rgba(20,14,12,0.9)';
      }
      x.fillRect(px+4, py+6, colW-8, rowH-16);
      x.fillStyle = 'rgba(30,24,20,0.85)';
      x.fillRect(px+4, py+rowH-10, colW-8, 3);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export function makeArtDecoTex(w = 512, h = 512) {
  const c = canvas(w, h);
  const x = c.getContext('2d');
  x.fillStyle = '#9a8c74'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 8000; i++) {
    const v = Math.random() * 20;
    x.fillStyle = `rgba(${160+v|0},${148+v|0},${120+v|0},0.1)`;
    x.fillRect(Math.random()*w|0, Math.random()*h|0, 1, 1);
  }
  for (let px = 0; px < w; px += 64) {
    x.fillStyle = 'rgba(60,50,40,0.55)'; x.fillRect(px, 0, 8, h);
    x.fillStyle = 'rgba(220,200,160,0.22)'; x.fillRect(px+8, 0, 3, h);
    x.fillStyle = 'rgba(60,50,40,0.55)'; x.fillRect(px+56, 0, 8, h);
  }
  const colW = 64, rowH = 40;
  for (let py = 0; py < h; py += rowH)
    for (let px = 0; px < w; px += colW) {
      const lit = Math.random() < 0.45;
      if (lit) {
        const a = 0.55 + Math.random() * 0.4;
        x.fillStyle = `rgba(255,225,175,${a})`;
      } else {
        x.fillStyle = 'rgba(30,26,22,0.9)';
      }
      x.fillRect(px+16, py+8, 32, rowH-16);
      x.strokeStyle = 'rgba(20,15,10,0.85)'; x.lineWidth = 2;
      x.strokeRect(px+16, py+8, 32, rowH-16);
      x.fillStyle = 'rgba(20,15,10,0.8)';
      x.fillRect(px+31, py+8, 2, rowH-16);
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export function makeStorefrontTex(w = 1024, h = 256) {
  const c = canvas(w, h);
  const x = c.getContext('2d');
  x.fillStyle = '#0a0810'; x.fillRect(0, 0, w, h);
  const colors = ['#ff4d8a','#4dcaff','#ffd24d','#8aff9c','#ff8a4d','#c8a0ff','#4dff88','#ff5c4d'];
  const bw = 128;
  for (let i = 0; i < w; i += bw) {
    const col = colors[(i/bw|0) % colors.length];
    // Awning
    for (let s = 0; s < 6; s++) {
      x.fillStyle = s % 2 === 0 ? col : '#f0f0f0';
      x.fillRect(i + 6 + s * ((bw-12)/6), 0, (bw-12)/6, 42);
    }
    x.fillStyle = 'rgba(0,0,0,0.5)';
    x.fillRect(i+6, 42, bw-12, 4);
    // Window with warm interior
    x.fillStyle = 'rgba(30,40,60,0.85)';
    x.fillRect(i+10, 50, bw-20, h-70);
    const grd = x.createLinearGradient(0, 50, 0, h-20);
    grd.addColorStop(0, 'rgba(255,220,160,0.35)');
    grd.addColorStop(1, 'rgba(255,200,120,0.6)');
    x.fillStyle = grd;
    x.fillRect(i+10, 50, bw-20, h-70);
    x.fillStyle = 'rgba(0,0,0,0.6)';
    x.fillRect(i + bw/2 - 1, 50, 2, h-70);
    x.fillStyle = col;
    x.fillRect(i+14, 46, bw-28, 4);
    x.strokeStyle = 'rgba(0,0,0,0.9)'; x.lineWidth = 3;
    x.strokeRect(i+6, 0, bw-12, h);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export function makeLobbyTex() {
  const c = canvas(256, 256);
  const x = c.getContext('2d');
  x.fillStyle = '#0d0f14'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2; i++) {
    const px = i * 128;
    const grd = x.createLinearGradient(0, 20, 0, 236);
    grd.addColorStop(0, 'rgba(180,210,255,0.7)');
    grd.addColorStop(1, 'rgba(255,220,150,0.75)');
    x.fillStyle = grd;
    x.fillRect(px+12, 20, 104, 216);
    x.fillStyle = 'rgba(180,180,180,0.9)';
    x.fillRect(px+106, 98, 3, 60);
    x.strokeStyle = 'rgba(20,15,10,0.95)'; x.lineWidth = 4;
    x.strokeRect(px+12, 20, 104, 216);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function makeBillboardTex(text, hue) {
  const c = canvas(512, 256);
  const x = c.getContext('2d');
  x.fillStyle = '#050810'; x.fillRect(0, 0, 512, 256);
  x.fillStyle = `hsl(${hue},90%,55%)`; x.fillRect(10, 10, 492, 236);
  x.fillStyle = '#050810'; x.fillRect(22, 22, 468, 212);
  x.fillStyle = `hsl(${hue},100%,70%)`;
  x.font = 'bold 96px Arial';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 256, 128);
  x.strokeStyle = `hsl(${hue},100%,80%)`; x.lineWidth = 2;
  x.strokeRect(20, 20, 472, 216);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}