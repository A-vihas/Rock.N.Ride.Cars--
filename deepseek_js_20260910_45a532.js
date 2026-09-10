// All tunable constants in one place.

export const WORLD_HALF = 300;
export const SAVE_KEY = 'rocknride_save_v6';

// Highway
export const HWY_Y = 14;
export const HWY_W = 24;
export const HWY_HALF = 255;

// City grid
export const STREETS = [-220, -132, -44, 44, 132, 220];
export const STREET_WIDTH = 18;
export const BLOCK_SIZE = 70;
export const SIDEWALK = 5;
export const BLOCK_CENTERS = [-176, -88, 0, 88, 176];
export const PARK_BLOCKS = new Set([
  '-176,0','176,0','0,-176','0,176',
  '-88,-88','88,88','-88,88','88,-88',
  '-176,-176','176,176','-176,176','176,-176',
]);

// Platform (highway decks)
export const PLATFORMS = [
  { x: 0, z: -HWY_HALF, rot: 0, w: HWY_HALF * 2, d: HWY_W, y: HWY_Y },
  { x: 0, z:  HWY_HALF, rot: 0, w: HWY_HALF * 2, d: HWY_W, y: HWY_Y },
  { x:  HWY_HALF, z: 0, rot: 0, w: HWY_W, d: HWY_HALF * 2, y: HWY_Y },
  { x: -HWY_HALF, z: 0, rot: 0, w: HWY_W, d: HWY_HALF * 2, y: HWY_Y },
];

// Ramps: local +Z is up-slope. rot = yaw.
export const RAMPS = [
  { x: 0, z: -44, rot:  Math.PI/2, w: 14, d: 40, h: 7 },
  { x: 0, z:  44, rot: -Math.PI/2, w: 14, d: 40, h: 7 },
  { x: -44, z: 0, rot:  0,         w: 14, d: 40, h: 7 },
  { x: 44,  z: 0, rot:  Math.PI,   w: 14, d: 40, h: 7 },
  { x: -176, z: 0, rot: 0,         w: 12, d: 32, h: 6 },
  { x: 176,  z: 0, rot: Math.PI,   w: 12, d: 32, h: 6 },
  { x: 0, z: -176, rot:  Math.PI/2, w: 12, d: 32, h: 6 },
  { x: 0, z: 176,  rot: -Math.PI/2, w: 12, d: 32, h: 6 },
  { x: -88, z: -88, rot:  Math.PI/4,  w: 10, d: 28, h: 5 },
  { x: 88,  z: 88,  rot: -3*Math.PI/4, w: 10, d: 28, h: 5 },
  { x: 88,  z: -88, rot: -Math.PI/4,  w: 10, d: 28, h: 5 },
  { x: -88, z: 88,  rot:  3*Math.PI/4, w: 10, d: 28, h: 5 },
  { x: -44, z: -232, rot: Math.PI, w: 18, d: 46, h: HWY_Y },
  { x: 44,  z: 232, rot: 0,        w: 18, d: 46, h: HWY_Y },
  { x: 232, z: -44, rot: -Math.PI/2, w: 18, d: 46, h: HWY_Y },
  { x:-232, z: 44,  rot: Math.PI/2,  w: 18, d: 46, h: HWY_Y },
  { x: 132, z: -232, rot: Math.PI, w: 18, d: 46, h: HWY_Y },
  { x:-132, z: 232, rot: 0,        w: 18, d: 46, h: HWY_Y },
  { x: 232, z: 132, rot: -Math.PI/2, w: 18, d: 46, h: HWY_Y },
  { x:-232, z:-132, rot: Math.PI/2,  w: 18, d: 46, h: HWY_Y },
];
for (const r of RAMPS) {
  r._c = Math.cos(r.rot); r._s = Math.sin(r.rot);
  r._slope = r.h / r.d;
  r._ax = Math.sin(r.rot); r._az = Math.cos(r.rot);
}

// Car classes
export const CAR_CLASSES = [
  { id:'m5',     name:'BMW M5',           sub:'SPORT SEDAN',    cost:0,    speed:72,  accel:30, grip:1.06, spd:7, acc:6, hdl:7 },
  { id:'m4',     name:'BMW M4',           sub:'SPORT COUPE',    cost:80,   speed:80,  accel:35, grip:1.12, spd:8, acc:7, hdl:8 },
  { id:'muscle', name:'CHALLENGER',       sub:'MUSCLE',         cost:180,  speed:84,  accel:42, grip:0.96, spd:8, acc:8, hdl:5 },
  { id:'suv',    name:'G-CLASS',          sub:'OFF-ROAD SUV',   cost:250,  speed:62,  accel:26, grip:1.18, spd:5, acc:5, hdl:7 },
  { id:'lambo',  name:'LAMBORGHINI',      sub:'AVENTADOR · AWD',cost:500,  speed:98,  accel:50, grip:1.24, spd:10,acc:9, hdl:10 },
  { id:'jesko',  name:'KOENIGSEGG JESKO', sub:'HYPERCAR · 1600hp',cost:1500,speed:132, accel:62, grip:1.36, spd:10,acc:10,hdl:9 },
];

// Time presets
export const TIME_PRESETS = [
  { id:'morning', hour: 7.5,  name:'MORNING',  sub:'CLEAR SKY',   cost: 0, swatch:'linear-gradient(180deg,#5a9ee8,#a8c8e8 55%,#ffd0a0)' },
  { id:'noon',    hour: 12.5, name:'AFTERNOON',sub:'BRIGHT BLUE', cost: 0, swatch:'linear-gradient(180deg,#3a8ee8,#80b8e8 60%,#c0e0ff)' },
  { id:'sunset',  hour: 18.5, name:'SUNSET',   sub:'GOLDEN HOUR', cost: 0, swatch:'linear-gradient(180deg,#3a5ea8,#ff8050 55%,#ff5030)' },
  { id:'night',   hour: 22.0, name:'NIGHT',    sub:'NEON LIGHTS', cost: 0, swatch:'linear-gradient(180deg,#02030a,#0a1030 50%,#1a2040)' },
  { id:'golden',  hour: 17.0, name:'GOLDEN',   sub:'AMBER SKY',   cost: 100, swatch:'linear-gradient(180deg,#4a7ab8,#ffb060 55%,#ff7030)' },
  { id:'midnight',hour: 1.0,  name:'MIDNIGHT', sub:'DEEP CITY',   cost: 300, swatch:'linear-gradient(180deg,#01020a,#050818 50%,#0a0c1a)' },
];

export const SECONDS_PER_HOUR = 22;
export const TRAFFIC_COLORS = [0xdd3322, 0x2c7cff, 0xffbf35, 0x38f7c0, 0xffffff, 0x222222, 0x8833cc, 0xff6a3a, 0x4a90d9, 0xcc2244];

export function getCarClass(id) {
  return CAR_CLASSES.find(c => c.id === id) || CAR_CLASSES[0];
}