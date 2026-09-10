import { getCarClass } from './config.js';
import { P, keys } from './state.js';
import { rampAt, groundHeightAt } from './world.js';
import { WORLD_HALF } from './config.js';

export function updatePlayer(dt, player, callbacks) {
  const { onAir, onCheckpoint, onCoin, onTakeOver, trafficCars, hwyTraffic, parkedCars, coinPickups } = callbacks;

  const cls = getCarClass(P.carClass);
  const throttle = keys['w'] ? 1 : 0;
  const brake    = keys['s'] ? 1 : 0;
  // Steering FIXED: A = left (heading increases), D = right (heading decreases)
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

  // Ramp blocking (prevents phasing through the wrong side)
  let blocked = false;
  const hitRamp = rampAt(nx, nz);
  if (hitRamp) {
    const t = (hitRamp.lz + hitRamp.ramp.d/2) / hitRamp.ramp.d;
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
    const t = (here.lz + here.ramp.d/2) / here.ramp.d;
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
      if (P.airTime > 0.35 && onAir) onAir(P.airTime);
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
  const cp = refsCheckpoint(P.cpIndex);
  if (cp && Math.hypot(P.x - cp.x, P.y - cp.y, P.z - cp.z) < 4.4) {
    P.score += 1500 + (P.airborne ? 800 : 0);
    P.coins += 25 + (P.airborne ? 15 : 0);
    P.cpIndex = (P.cpIndex + 1) % callbacks.checkpoints.length;
    if (onCheckpoint) onCheckpoint();
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
      if (onCoin) onCoin(5);
    }
  }

  // Take-over
  if (P.swapCooldown > 0) P.swapCooldown -= dt;
  else {
    const TARGET_R = 3.2;
    const tryList = [trafficCars, hwyTraffic, parkedCars];
    outer:
    for (const list of tryList) {
      for (const t of list) {
        if (t.taken) continue;
        if (Math.hypot(P.x - t.mesh.position.x, P.z - t.mesh.position.z) < TARGET_R &&
            Math.abs(P.y - t.mesh.position.y) < 2.5) {
          if (onTakeOver) onTakeOver(t);
          break outer;
        }
      }
    }
  }
}

function refsCheckpoint(index) {
  return window.__rockCheckpoints ? window.__rockCheckpoints[index] : null;
}
