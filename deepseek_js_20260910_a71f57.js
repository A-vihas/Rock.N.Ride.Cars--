import * as THREE from 'three';
import { P } from './state.js';

const camTargetPos = new THREE.Vector3();
const camLookAt = new THREE.Vector3();

export function updateCamera(dt, camera, camMode) {
  if (camMode === 0) {
    camTargetPos.set(P.x + Math.sin(P.heading) * 11, P.y + 5.5, P.z + Math.cos(P.heading) * 11);
    camLookAt.set(P.x, P.y + 1.3, P.z);
  } else if (camMode === 1) {
    camTargetPos.set(P.x - Math.sin(P.heading) * 0.4, P.y + 1.55, P.z - Math.cos(P.heading) * 0.4);
    camLookAt.set(P.x - Math.sin(P.heading) * 14, P.y + 1.1, P.z - Math.cos(P.heading) * 14);
  } else {
    camTargetPos.set(P.x, P.y + 45, P.z + 0.5);
    camLookAt.set(P.x, P.y, P.z);
  }
  const k = 1 - Math.pow(0.0015, dt);
  camera.position.lerp(camTargetPos, k);
  camera.lookAt(camLookAt);
}