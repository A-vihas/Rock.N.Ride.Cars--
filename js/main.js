console.log('MAIN.JS LOADED');
import { getCarClass, HWY_Y, HWY_HALF, HWY_W, STREET_WIDTH, STREETS, TRAFFIC_COLORS } from './config.js';

let seed = 4423;
export const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

export function randomClassId() {
  const r = rnd();
  if (r < 0.35) return 'm5';
  if (r < 0.60) return 'm4';
  if (r < 0.75) return 'muscle';
  if (r < 0.87) return 'suv';
  if (r < 0.96) return 'lambo';
  return 'jesko';
}

export function randomColor() {
  return TRAFFIC_COLORS[Math.floor(rnd() * TRAFFIC_COLORS.length)];
}

export function updateTraffic(dt, trafficCars, hwyTraffic) {
  const bound = 240;
  for (const t of trafficCars) {
    if (t.taken) continue;
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
    if (t.taken) continue;
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

export function updateCoins(now, coinPickups) {
  for (const c of coinPickups) {
    if (c.taken && now > c.respawnAt) {
      c.taken = false;
      c.mesh.visible = true;
    }
    if (!c.taken) {
      c.mesh.rotation.z += 0.02;
      const baseY = c.y ?? 1.5;
      c.mesh.position.y = baseY + Math.sin(now * 0.003 + c.spin) * 0.3;
    }
  }
}

export function respawnVehicle(veh, makeCar) {
  const clsId = randomClassId();
  const newMesh = makeCar(clsId, randomColor());
  veh.mesh.parent && veh.mesh.parent.remove(veh.mesh);
  veh.mesh = newMesh;
  veh.taken = false;
  veh.respawnAt = 0;
  if (veh.type === 'parked') {
    newMesh.position.set(veh.x, 0.3, veh.z);
    newMesh.rotation.y = veh.rot;
  } else if (veh.type === 'traffic') {
    veh.pos = (rnd() * 2 - 1) * 240;
    newMesh.position.set(
      veh.axis === 'x' ? veh.pos : veh.street + veh.lane,
      0.3,
      veh.axis === 'x' ? veh.street + veh.lane : veh.pos
    );
  } else {
    veh.pos = (rnd() * 2 - 1) * 240;
    if (veh.axis === 'x') newMesh.position.set(veh.pos, HWY_Y + 0.3, veh.side * HWY_HALF + veh.off);
    else newMesh.position.set(veh.side * HWY_HALF + veh.off, HWY_Y + 0.3, veh.pos);
  }
  return newMesh;
}
