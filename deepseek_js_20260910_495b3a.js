import { CAR_CLASSES, TIME_PRESETS, getCarClass } from './config.js';
import { setSelectedPreset, setSelectedCarClass, setPlayerColor } from './state.js';

const $ = id => document.getElementById(id);

export function renderTimeTiles(save, selected, onSelect) {
  const grid = $('timeGrid');
  grid.innerHTML = '';
  for (const p of TIME_PRESETS) {
    const can = save.coins >= p.cost;
    const d = document.createElement('button');
    d.className = 'time-tile' + (p === selected ? ' active' : '') + (can ? '' : ' locked');
    d.innerHTML = `<div class="swatch" style="background:${p.swatch}"></div>
      <span class="label">${p.name}</span>
      <span class="sub">${p.sub}</span>
      ${p.cost > 0 ? `<span class="price"><i></i>${p.cost}</span>` : ''}`;
    d.addEventListener('click', () => {
      if (!can) {
        d.animate([
          { transform: 'translateX(-4px)' },
          { transform: 'translateX(4px)' },
          { transform: 'translateX(-4px)' },
          { transform: 'translateX(0)' },
        ], { duration: 250 });
        return;
      }
      onSelect(p);
    });
    grid.appendChild(d);
  }
}

export function renderCarTiles(save, selected, onSelect) {
  const grid = $('carGrid');
  grid.innerHTML = '';
  for (const c of CAR_CLASSES) {
    const can = save.coins >= c.cost;
    const d = document.createElement('button');
    d.className = 'car-tile' + (c.id === selected ? ' active' : '') + (can ? '' : ' locked');
    d.innerHTML = `
      <span class="car-name">${c.name}</span>
      <span class="car-sub">${c.sub}</span>
      <div class="bars">
        <span>SPD</span><span class="bar"><i style="width:${c.spd*10}%"></i></span>
        <span>ACC</span><span class="bar"><i style="width:${c.acc*10}%"></i></span>
        <span>HDL</span><span class="bar"><i style="width:${c.hdl*10}%"></i></span>
      </div>
      <span class="cost ${c.cost === 0 ? 'free' : ''}">${c.cost === 0 ? 'FREE' : c.cost + '¢'}</span>
    `;
    d.addEventListener('click', () => {
      if (!can) {
        d.animate([
          { transform: 'translateX(-3px)' },
          { transform: 'translateX(3px)' },
          { transform: 'translateX(-3px)' },
          { transform: 'translateX(0)' },
        ], { duration: 200 });
        return;
      }
      onSelect(c.id);
    });
    grid.appendChild(d);
  }
}

export function updateStartButton(save, preset, carId) {
  const total = preset.cost + getCarClass(carId).cost;
  $('startBtn').innerHTML = total === 0
    ? 'START ENGINE <span>›</span>'
    : `START ENGINE — ${total}¢ <span>›</span>`;
}

export function setupPaintRow(onPaint) {
  $('paintRow').addEventListener('click', e => {
    const btn = e.target.closest('button[data-color]');
    if (!btn) return;
    $('paintRow').querySelectorAll('button').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    onPaint(parseInt(btn.dataset.color.slice(1), 16));
  });
}