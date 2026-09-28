// Combate 2d6 — lógica de interfaz. Usa engine.js (resolveCombat, enumerateProbabilities,
// lookupMatchup) y data.js (UNIDADES, ENFRENTAMIENTOS) ya inlineados en el mismo documento.
// Sin dependencias externas.

const CIV_META = {
  Egipto:   { label: 'Egipto',   tag: 'Poder del Nilo',   sub: 'Monumentos & Faraones', color: 'primary',   icon: 'shield' },
  Griegos:  { label: 'Griegos',  tag: 'Favor Olímpico',   sub: 'Hoplitas & Filósofos',  color: 'secondary', icon: 'laurel' },
  Nordicos: { label: 'Nórdicos', tag: 'Furia de Odín',    sub: 'Jarls & Valkirias',     color: 'tertiary',  icon: 'sword' },
};
const TIPO_META = {
  mortal: { label: 'Mortales', glyph: '●', sub: 'Fuerza Base' },
  mitico: { label: 'Míticos', glyph: '◆', sub: 'Poder Divino' },
  heroe:  { label: 'Héroes',  glyph: '★', sub: 'Antimítico' },
};
const TIPO_ORDER = ['mortal', 'mitico', 'heroe'];

function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* localStorage no disponible: seguimos sin persistir */ }
}

function freshPlayer() {
  return {
    civ: null, unidad: null, tipo: null, habilidad: '', berserkBonus: 0,
    ready: false, unitReady: false, revealed: false,
    wall: false, throwOn: false, berserkActive: false, manualMod: 0,
    hydraCount: 0, valkyrieCount: 0, retired: false,
    die1: null, die2: null,
  };
}

const DEFAULT_STATE = {
  screen: 'civ', // 'civ' | 'unidad' | 'combate'
  players: { A: freshPlayer(), B: freshPlayer() },
  hiddenSelection: false,
  lastResult: null,
  ruleExpanded: false,
  history: [],
  settings: {
    tieRule: 'repetir', // 'repetir' | 'defensor'
    defenderSide: null,
    doublesRulesOn: true,
    singleView: false,
    haptics: true,
    sound: false,
    instantRolls: false,
    theme: 'oscuro', // 'oscuro' | 'claro' | 'auto'
  },
  drawerOpen: false,
  settingsOpen: false,
  abilityCard: null,
};

let state = storageGet('combate2d6-state', null) || JSON.parse(JSON.stringify(DEFAULT_STATE));
// Migración defensiva por si el localStorage guardó una forma antigua/incompleta.
state.players = state.players || { A: freshPlayer(), B: freshPlayer() };
state.settings = Object.assign({}, DEFAULT_STATE.settings, state.settings || {});

// Bandera transitoria de animación de tirada — NO se persiste (vive fuera de `state`).
let rollingAnim = false;

function persist() { storageSet('combate2d6-state', state); }

function otherSide(side) { return side === 'A' ? 'B' : 'A'; }

function vibrate(ms) {
  if (state.settings.haptics && navigator.vibrate) {
    try { navigator.vibrate(ms); } catch (e) { /* sin soporte de vibración */ }
  }
}

let audioCtx = null;
// Sonido de dados: varios golpes cortos de ruido filtrado, emulando un traqueteo de dados,
// sintetizado con Web Audio (sin archivos de audio, sin red).
function playDiceSound() {
  if (!state.settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    const now = ctx.currentTime;
    const hits = 5;
    for (let i = 0; i < hits; i++) {
      const t = now + i * 0.09 + Math.random() * 0.02;
      const dur = 0.05;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1) * (1 - j / data.length);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000 + Math.random() * 900;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.28 * (1 - (i / hits) * 0.5), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(t);
      src.stop(t + dur);
    }
  } catch (e) { /* Web Audio no disponible */ }
}

function applyTheme() {
  const root = document.documentElement;
  let effective = state.settings.theme;
  if (effective === 'auto') {
    effective = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro';
  }
  root.setAttribute('data-theme', effective);
}

let wakeLock = null;
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) { /* no disponible o denegado: seguimos sin bloquear pantalla */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestWakeLock();
});

// ---------- Datos derivados ----------
function unitsForCiv(civ) { return UNIDADES.filter((u) => u.civ === civ); }
function findUnit(civ, unidad) { return UNIDADES.find((u) => u.civ === civ && u.unidad === unidad); }

function getMatchup(sideA, sideB) {
  if (!sideA.civ || !sideA.unidad || !sideB.civ || !sideB.unidad) return null;
  const row = lookupMatchup(ENFRENTAMIENTOS, sideA.civ, sideA.unidad, sideB.civ, sideB.unidad);
  return row;
}

function modifiersFor(side, tableTotalOther) {
  const mods = [];
  if (side.wall) mods.push({ id: 'wall', label: 'Muro/Torre', value: 2 });
  if (side.throwOn) mods.push({ id: 'throw', label: 'Lanzar', value: 3 });
  if (side.berserkActive) mods.push({ id: 'berserk', label: 'Berserk', value: 2 });
  if (side.unidad === 'Hydra' && side.hydraCount > 0) mods.push({ id: 'hydra', label: 'Hidra', value: side.hydraCount * 1 });
  if (side.unidad === 'Valkyrie' && side.valkyrieCount > 0) mods.push({ id: 'valkyrie', label: 'Valkiria', value: side.valkyrieCount * 2 });
  if (side.manualMod !== 0) mods.push({ id: 'manual', label: 'Ajuste manual', value: side.manualMod });
  return mods;
}

function isMedusa(side) { return side.habilidad === 'Wins all ties'; }

function buildSideConfig(side, tableTotal) {
  return {
    tableTotal,
    modifiers: modifiersFor(side),
    medusa: state.settings.doublesRulesOn && isMedusa(side),
    berserkActive: state.settings.doublesRulesOn && side.berserkActive,
  };
}

// ---------- Dado 3D (CSS puro, sin three.js ni imágenes) ----------
// Coordenadas (left%, top%) de las 9 posiciones posibles de un pip, en orden de lectura.
const PIP_COORDS = {
  1: [20, 20], 2: [50, 20], 3: [80, 20],
  4: [20, 50], 5: [50, 50], 6: [80, 50],
  7: [20, 80], 8: [50, 80], 9: [80, 80],
};
const PIP_LAYOUT = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const FACE_HTML = {};
for (let v = 1; v <= 6; v++) {
  FACE_HTML[v] = PIP_LAYOUT[v].map((i) => {
    const [left, top] = PIP_COORDS[i];
    return `<span class="die3d-pip" style="left:${left}%;top:${top}%"></span>`;
  }).join('');
}
// Caras opuestas suman 7 (1-6, 2-5, 3-4), como un dado real.
// Cara de dado plana (sin transforms 3D — robusta en todos los navegadores). Se usa para el
// estado en reposo (antes y después de tirar) dentro de cada mitad.
function dieFaceHTML(id, value) {
  const v = value || 1;
  const dim = value == null ? 'opacity:.35' : '';
  return `<div class="die2d" id="${id}" style="${dim}">${FACE_HTML[v]}</div>`;
}

// ---------- Overlay de colisión de dados (Matter.js, motor de física real) ----------
// Los 4 dados (2 del color de cada lado) chocan entre sí y contra los bordes de la pantalla
// durante ~1.3s; el valor final de cada uno ya está decidido de antemano por App.rollDice —
// la física es puramente visual, nunca decide el resultado.
function civColorHex(civ) {
  const varName = '--' + CIV_META[civ].color;
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#ebc166';
}

function runDiceCollision(rolls, onDone) {
  const overlay = document.getElementById('dice-overlay');
  overlay.innerHTML = '';
  const canvas = document.createElement('canvas');
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = w; canvas.height = h;
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;';
  overlay.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const { Engine, Bodies, Composite, Body, Runner } = Matter;
  const engine = Engine.create({ gravity: { x: 0, y: 0 } });
  const size = 56;
  const wallOpts = { isStatic: true, restitution: 1 };
  const walls = [
    Bodies.rectangle(w / 2, -20, w + 80, 40, wallOpts),
    Bodies.rectangle(w / 2, h + 20, w + 80, 40, wallOpts),
    Bodies.rectangle(-20, h / 2, 40, h + 80, wallOpts),
    Bodies.rectangle(w + 20, h / 2, 40, h + 80, wallOpts),
  ];

  const dice = rolls.map((roll, i) => {
    const cx = w / 2 + (i < 2 ? -1 : 1) * (60 + Math.random() * 40);
    const cy = h / 2 + (i % 2 === 0 ? -1 : 1) * (60 + Math.random() * 40);
    const body = Bodies.rectangle(cx, cy, size, size, {
      chamfer: { radius: 10 },
      restitution: 0.75, friction: 0.02, frictionAir: 0.006, density: 0.002,
    });
    Body.setVelocity(body, { x: (Math.random() - 0.5) * 26, y: (Math.random() - 0.5) * 26 });
    Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.9);
    return { body, color: roll.color, finalValue: roll.value, displayValue: 1 + Math.floor(Math.random() * 6) };
  });

  Composite.add(engine.world, [...walls, ...dice.map((d) => d.body)]);
  const runner = Runner.create();
  Runner.run(runner, engine);

  let frame = 0;
  let raf = null;
  function drawDie(d) {
    const { body, color } = d;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = color;
    const r = 10, s = size;
    ctx.beginPath();
    ctx.moveTo(-s / 2 + r, -s / 2);
    ctx.arcTo(s / 2, -s / 2, s / 2, s / 2, r);
    ctx.arcTo(s / 2, s / 2, -s / 2, s / 2, r);
    ctx.arcTo(-s / 2, s / 2, -s / 2, -s / 2, r);
    ctx.arcTo(-s / 2, -s / 2, s / 2, -s / 2, r);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    PIP_LAYOUT[d.displayValue].forEach((idx) => {
      const [leftPct, topPct] = PIP_COORDS[idx];
      const px = (leftPct / 100 - 0.5) * s;
      const py = (topPct / 100 - 0.5) * s;
      ctx.beginPath();
      ctx.arc(px, py, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function tick() {
    frame++;
    ctx.clearRect(0, 0, w, h);
    if (frame % 6 === 0) {
      dice.forEach((d) => { d.displayValue = 1 + Math.floor(Math.random() * 6); });
    }
    dice.forEach(drawDie);
    raf = requestAnimationFrame(tick);
  }
  tick();

  setTimeout(() => {
    dice.forEach((d) => { d.displayValue = d.finalValue; });
    ctx.clearRect(0, 0, w, h);
    dice.forEach(drawDie);
    cancelAnimationFrame(raf);
    Runner.stop(runner);
    Engine.clear(engine);
    setTimeout(() => { overlay.innerHTML = ''; onDone(); }, 260);
  }, 1300);
}

// ---------- Render raíz ----------
const topEl = document.getElementById('half-top');
const bottomEl = document.getElementById('half-bottom');
const centerEl = document.getElementById('center-strip');
const overlaysEl = document.getElementById('overlays');

function render() {
  applyTheme();
  const single = state.settings.singleView;
  topEl.classList.toggle('hidden-side', single);
  bottomEl.innerHTML = renderHalf('A');
  topEl.innerHTML = single ? '' : renderHalf('B');
  centerEl.innerHTML = renderCenter();
  overlaysEl.innerHTML = renderOverlays();
  persist();
}

function renderHalf(side) {
  const p = state.players[side];
  switch (state.screen) {
    case 'civ': return renderCivHalf(side, p);
    case 'unidad': return renderUnidadHalf(side, p);
    case 'combate': return renderCombateHalf(side, p);
    default: return '';
  }
}

// ---------- Paso 1: elegir civilización ----------
function renderCivHalf(side, p) {
  const otherCiv = state.players[otherSide(side)].civ;
  const tiles = Object.keys(CIV_META).map((civKey) => {
    const meta = CIV_META[civKey];
    const selected = p.civ === civKey;
    const disabled = !selected && otherCiv === civKey;
    const cls = ['civ-tile'];
    if (selected) cls.push('selected');
    if (disabled) cls.push('disabled');
    const stripe = selected ? `<div class="stripe" style="background:var(--${meta.color})"></div>` : '';
    const badge = selected
      ? `<div class="check-badge" style="background:var(--${meta.color});color:var(--on-${meta.color})">${icon('check', 14)}</div>`
      : disabled
        ? `<span class="muted">${icon('lock', 18)}</span>`
        : `<span class="muted" style="opacity:.5">${icon('plus', 16)}</span>`;
    return `<button class="${cls.join(' ')}" ${disabled ? 'disabled' : ''} onclick="App.selectCiv('${side}','${civKey}')">
      ${stripe}
      <div class="row">
        <div class="ico-box" style="color:var(--${meta.color})">${icon(meta.icon, 22)}</div>
        <div class="info">
          <span class="name" style="color:${selected ? `var(--${meta.color})` : 'inherit'}">${meta.label.toUpperCase()}</span>
          <span class="sub">${disabled ? 'Ocupado por el rival' : meta.sub}</span>
        </div>
      </div>
      ${badge}
    </button>`;
  }).join('');

  return `
    <div class="row-between" style="margin-bottom:10px">
      <div>
        <div class="muted label" style="font-size:11px">Jugador ${side === 'A' ? '1' : '2'}</div>
        <div class="font-display" style="font-size:18px;font-weight:700;color:var(--primary)">Elige tu civilización</div>
      </div>
    </div>
    <div style="flex:1">${tiles}</div>
    <button class="big-btn" style="margin-top:10px;background:${p.ready ? 'var(--surface-container-high)' : 'var(--primary)'};color:${p.ready ? 'var(--on-surface)' : 'var(--on-primary)'}"
      ${p.civ ? '' : 'disabled'} onclick="App.toggleCivReady('${side}')">
      ${icon(p.ready ? 'check' : 'shield', 18)}<span>${p.ready ? 'Listo' : 'Confirmar elección'}</span>
    </button>`;
}

// ---------- Paso 2: elegir unidad ----------
function renderUnidadHalf(side, p) {
  const meta = CIV_META[p.civ];
  const units = unitsForCiv(p.civ);
  const groups = TIPO_ORDER.map((tipo) => {
    const list = units.filter((u) => u.tipo === tipo);
    const tm = TIPO_META[tipo];
    const tiles = list.map((u) => {
      const selected = p.unidad === u.unidad;
      const hasAbility = !!u.habilidad;
      return `<button class="unit-btn ${selected ? 'selected' : ''}"
        style="${selected ? `background:var(--${meta.color}-container,var(--${meta.color}));color:var(--on-${meta.color})` : ''}"
        onmousedown="App.startLongPress('${p.civ}','${u.unidad}')" onmouseup="App.cancelLongPress()" onmouseleave="App.cancelLongPress()"
        ontouchstart="App.startLongPress('${p.civ}','${u.unidad}')" ontouchend="App.cancelLongPress()"
        onclick="App.selectUnit('${side}','${u.unidad}')">
        ${hasAbility ? `<span class="ability-dot" style="background:var(--${meta.color})"></span>` : ''}
        <span class="uname">${u.unidad}</span>
        <span class="utype"><span class="type-glyph">${tm.glyph}</span>${hasAbility ? '• Habilidad' : tm.label.slice(0, 3)}</span>
      </button>`;
    }).join('');
    return `<div>
      <div class="group-header"><span class="type-glyph">${tm.glyph}</span>${tm.label}<span class="fill">${tm.sub}</span></div>
      <div class="unit-grid">${tiles}</div>
    </div>`;
  }).join('');

  const mask = state.hiddenSelection && !p.revealed
    ? `<div class="hidden-mask">
        ${icon('eyeOff', 34)}
        <div style="font-weight:700">Selección oculta</div>
        <div class="muted" style="font-size:12px">Toca para desbloquear y elegir en secreto</div>
        <button class="big-btn" style="background:var(--surface-container-high);min-height:44px" onclick="App.revealSide('${side}')">Revelar pantalla</button>
      </div>`
    : '';

  return `
    <div style="position:relative;flex:1;display:flex;flex-direction:column;min-height:0">
      ${mask}
      <div class="unit-header">
        <div class="row" style="gap:6px">
          <span style="width:8px;height:8px;border-radius:999px;background:var(--${meta.color})"></span>
          <span style="font-weight:700;letter-spacing:.05em;color:var(--${meta.color})">${meta.label.toUpperCase()}</span>
          <span class="muted" style="font-size:11px">• J${side === 'A' ? '1' : '2'}</span>
        </div>
        <div class="unit-badge">${p.unidad ? `<span class="type-glyph">${TIPO_META[p.tipo].glyph}</span>` : ''}<span class="name">${p.unidad || 'Sin elegir'}</span></div>
      </div>
      <div style="flex:1;overflow-y:auto">${groups}</div>
      <button class="big-btn" style="margin-top:8px;background:${p.unitReady ? 'var(--surface-container-high)' : `var(--${meta.color})`};color:${p.unitReady ? 'var(--on-surface)' : `var(--on-${meta.color})`}"
        ${p.unidad ? '' : 'disabled'} onclick="App.toggleUnitReady('${side}')">
        ${icon('check', 18)}<span>${p.unitReady ? `${meta.label} listo` : `Confirmar ${meta.label}`}</span>
      </button>
    </div>`;
}

// ---------- Paso 3: combate (incluye el resultado, en la misma pantalla) ----------
function renderCombateHalf(side, p) {
  const meta = CIV_META[p.civ];
  const otherP = state.players[otherSide(side)];
  const row = getMatchup(p, otherP);
  if (!row) {
    return `<div class="warning-banner">No existe un enfrentamiento registrado para esta combinación de unidades.</div>`;
  }
  return renderCombateHalfWithTotal(side, p, meta, tableTotalFor(p, otherP));
}

function tableTotalFor(p, otherP) {
  // getMatchup(p, otherP) consulta con p como lado "A", así que row.totalA ya es el total de p.
  const row = getMatchup(p, otherP);
  if (!row) return null;
  return row.totalA;
}

function renderCombateHalfWithTotal(side, p, meta, tableTotal) {
  const r = state.lastResult;
  const sideResult = r ? (side === 'A' ? r.a : r.b) : null;
  const isTie = r && r.winner === 'empate';
  const isWinner = r && r.winner === side;
  const isLoser = r && !isTie && !isWinner;

  const cfg = buildSideConfig(p, tableTotal);
  const modsSum = cfg.modifiers.reduce((s, m) => s + m.value, 0);
  const projected = tableTotal + modsSum;
  const otherP = state.players[otherSide(side)];

  const wallOn = p.wall;
  const canThrow = p.unidad === 'Cyclops';
  const throwEnabled = canThrow && otherP.wall;
  const canBerserk = p.berserkBonus > 0;
  const isHydra = p.unidad === 'Hydra';
  const isValkyrie = p.unidad === 'Valkyrie';

  const diceArea = `<div class="dice-pair">${dieFaceHTML(`die-${side}-1`, p.die1)}${dieFaceHTML(`die-${side}-2`, p.die2)}</div>`;

  const bigNumber = r ? sideResult.score : tableTotal;
  const bigLabel = r ? 'Total' : 'Tabla';
  const subLine = r
    ? `${sideResult.tableTotal} tabla + ${sideResult.diceSum} dados${sideResult.modifiersSum ? ` + ${sideResult.modifiersSum} mod.` : ''}`
    : `Puntaje previsto: <strong style="color:var(--${meta.color})">${projected}</strong>`;

  const badge = isTie
    ? `<div class="result-badge" style="background:var(--surface-container-high)">Empate</div>`
    : isWinner
      ? `<div class="result-badge" style="background:var(--${meta.color});color:var(--on-${meta.color})">${icon('medal', 14)}Gana</div>`
      : isLoser
        ? `<div class="result-badge" style="background:var(--surface-container-high);color:var(--on-surface-variant)">Derrota</div>`
        : `<div class="type-pill" style="color:var(--${meta.color})"><span class="type-glyph">${TIPO_META[p.tipo].glyph}</span>${TIPO_META[p.tipo].label.replace(/s$/, '')}</div>`;

  const bottomSection = r
    ? (isTie ? '' : `<div class="action-grid">
        <button class="action-btn" onclick="App.sameUnitAgain('${side}')">${icon('replay', 18)}<span class="lbl">Misma unidad</span></button>
        <button class="action-btn" onclick="App.changeUnit('${side}')">${icon('swap', 18)}<span class="lbl">Cambiar</span></button>
        <button class="action-btn" onclick="App.retireSide('${side}')">${icon('flag', 18)}<span class="lbl" style="color:var(--error)">Retirada</span></button>
      </div>`)
    : `<div class="mods-row">
        <button class="mod-chip ${wallOn ? 'active' : ''}" style="${wallOn ? `background:var(--${meta.color});color:var(--on-${meta.color})` : ''}" onclick="App.toggleMod('${side}','wall')">${icon('fort', 14)}Muro +2</button>
        ${canBerserk ? `<button class="mod-chip ${p.berserkActive ? 'active' : ''}" style="${p.berserkActive ? 'background:var(--tertiary);color:var(--on-tertiary)' : ''}" onclick="App.toggleMod('${side}','berserk')">${icon('sword', 14)}Berserk +2</button>` : ''}
        ${canThrow ? `<button class="mod-chip ${p.throwOn ? 'active' : ''}" style="${p.throwOn ? `background:var(--${meta.color});color:var(--on-${meta.color})` : ''}" ${throwEnabled ? '' : 'disabled'} onclick="App.toggleMod('${side}','throw')">${icon('throw', 14)}Lanzar +3</button>` : ''}
        ${isHydra ? `<div class="counter-chip">${icon('sword', 12)}<span>Derrotas</span><div class="stepper"><button onclick="App.adjustCounter('${side}','hydraCount',-1)">${icon('minus', 12)}</button><span class="val">${p.hydraCount}</span><button onclick="App.adjustCounter('${side}','hydraCount',1)">${icon('plus', 12)}</button></div></div>` : ''}
        ${isValkyrie ? `<div class="counter-chip">${icon('sword', 12)}<span>Eliminadas</span><div class="stepper"><button onclick="App.adjustCounter('${side}','valkyrieCount',-1)">${icon('minus', 12)}</button><span class="val">${p.valkyrieCount}</span><button onclick="App.adjustCounter('${side}','valkyrieCount',1)">${icon('plus', 12)}</button></div></div>` : ''}
        <div class="stepper">
          <button onclick="App.adjustMod('${side}',-1)">${icon('minus', 14)}</button>
          <span class="val">${p.manualMod >= 0 ? '+' : ''}${p.manualMod}</span>
          <button onclick="App.adjustMod('${side}',1)">${icon('plus', 14)}</button>
        </div>
      </div>`;

  return `
    <div class="combat-header">
      <div class="who">
        <div>
          <div class="font-display" style="font-weight:700;font-size:16px;color:var(--${meta.color})">${p.unidad.toUpperCase()}</div>
          <div class="muted" style="font-size:11px;letter-spacing:.05em;text-transform:uppercase">${meta.label}</div>
        </div>
      </div>
      ${badge}
    </div>
    <div class="score-row" style="${isLoser ? 'opacity:.55' : ''}">
      <div>
        <div class="row" style="gap:8px;align-items:baseline">
          <span class="score-total font-display" style="font-size:64px;color:var(--${meta.color})">${bigNumber}</span>
          <span class="muted label" style="font-size:11px">${bigLabel}</span>
        </div>
        <div class="score-sub">${subLine}</div>
      </div>
      ${diceArea}
    </div>
    ${bottomSection}`;
}

// ---------- Centro: según pantalla ----------
function renderCenter() {
  switch (state.screen) {
    case 'civ': return renderCenterCiv();
    case 'unidad': return renderCenterUnidad();
    case 'combate': return renderCenterCombate();
    default: return '';
  }
}

function renderCenterCiv() {
  const bothReady = state.players.A.ready && state.players.B.ready;
  return `
    <div style="padding:10px 16px;display:flex;align-items:center;justify-content:space-between">
      <div class="row" style="gap:6px">
        ${icon('sword', 15)}
        <span class="label muted" style="font-size:12px">Combate 2D6</span>
      </div>
      <div class="row" style="gap:6px;background:var(--surface-container);padding:2px 10px;border-radius:999px">
        <span style="width:6px;height:6px;border-radius:999px;background:var(--primary)"></span>
        <span class="label" style="font-size:10px;color:var(--primary)">Fase 1: Alianzas${bothReady ? ' ✓' : ''}</span>
      </div>
      <button class="icon-btn" onclick="App.openSettings()">${icon('gear', 16)}</button>
    </div>`;
}

function renderCenterUnidad() {
  return `
    <div style="padding:10px 16px">
      <div class="row-between">
        <div>
          <div class="row" style="gap:6px"><span style="color:var(--primary)">${icon('shield', 16)}</span><span class="label" style="font-size:12px">Fase de designación</span></div>
          <div class="muted" style="font-size:11px">Elige tu unidad para el duelo</div>
        </div>
        <div class="row" style="gap:8px">
          <div style="text-align:right">
            <div style="font-size:11px;font-weight:600">Selección</div>
            <div class="muted" style="font-size:10px;text-transform:uppercase">${state.hiddenSelection ? 'Oculta' : 'Pública'}</div>
          </div>
          <button class="icon-btn" onclick="App.toggleHiddenSelection()">${icon(state.hiddenSelection ? 'eyeOff' : 'eye', 18)}</button>
          <button class="icon-btn" onclick="App.openSettings()">${icon('gear', 16)}</button>
        </div>
      </div>
    </div>`;
}

function renderCenterCombate() {
  const a = state.players.A, b = state.players.B;
  const row = getMatchup(a, b);
  const historyPull = `<div class="history-pull" onclick="App.openHistory()"><div class="bar"></div><div class="row muted" style="gap:4px;font-size:11px;justify-content:center">${icon('history', 14)}Historial de tiradas</div></div>`;

  if (!row) {
    return `<div style="padding:10px 16px 14px"><div class="warning-banner">Enfrentamiento no disponible: revisa las unidades elegidas.</div>${historyPull}</div>`;
  }

  const r = state.lastResult;

  if (!r) {
    const totalA = tableTotalFor(a, b);
    const totalB = tableTotalFor(b, a);
    const cfgA = buildSideConfig(a, totalA);
    const cfgB = buildSideConfig(b, totalB);
    const prob = enumerateProbabilities(cfgA, cfgB, { tieRule: state.settings.tieRule, defenderSide: state.settings.defenderSide });
    const pA = prob.pA * 100, pB = prob.pB * 100, pTie = prob.pTie * 100;
    const probHtml = `
      <div class="prob-bar">
        <div class="prob-seg" style="width:${pA}%;background:var(--primary)"></div>
        <div class="prob-seg" style="width:${pTie}%;background:var(--outline-variant)"></div>
        <div class="prob-seg" style="width:${pB}%;background:var(--secondary)"></div>
      </div>
      <div class="prob-labels">
        <span style="color:var(--primary);font-weight:700">${a.unidad} ${pA.toFixed(1)}%</span>
        <span class="muted">Empate ${pTie.toFixed(1)}%</span>
        <span style="color:var(--secondary);font-weight:700">${b.unidad} ${pB.toFixed(1)}%</span>
      </div>
      <div class="prob-effective">Efectivo (repitiendo empates): <strong>${(prob.efectivoA * 100).toFixed(0)}% – ${(prob.efectivoB * 100).toFixed(0)}%</strong></div>`;

    return `
      <div style="padding:10px 16px 10px">
        ${probHtml}
        <div style="padding-top:8px">
          <button class="roll-trigger" ${rollingAnim ? 'disabled' : ''} onclick="App.rollDice()">${icon('dice', 28)}<span>${rollingAnim ? 'Rodando…' : 'Tirar 2d6'}</span>${icon('dice', 28)}</button>
        </div>
        ${historyPull}
      </div>`;
  }

  // Hay resultado: se muestra en el mismo lugar de la barra/botón, sin cambiar de pantalla.
  const winnerName = r.winner === 'empate' ? null : (r.winner === 'A' ? a.unidad : b.unidad);
  const winnerCiv = r.winner === 'empate' ? null : CIV_META[r.winner === 'A' ? a.civ : b.civ];
  const headline = r.winner === 'empate' ? 'EMPATE — REPETIR' : `GANA ${winnerName.toUpperCase()} (${winnerCiv.label.toUpperCase()})`;
  const explainMap = {
    'dobles': r.reason === 'medusa' ? 'La Medusa petrifica: gana automáticamente al sacar dobles, sin importar el puntaje.' : 'El lado en Berserk pierde automáticamente al sacar dobles: el efecto contrario decide el combate.',
    'puntaje': 'Gana el lado con el puntaje total más alto (tabla + dados + modificadores).',
    'empate-habilidad': r.reason === 'medusa' ? 'Puntajes iguales: la Medusa gana todos los empates de puntaje por su naturaleza pétrea.' : 'Puntajes iguales: el lado en Berserk pierde todos los empates, así que el rival se lleva la victoria.',
    'empate-defensor': 'Empate real, resuelto por el ajuste de mesa: el defensor gana los empates.',
    'empate-real': 'Empate real: ninguna regla especial decide el resultado. Se repite la tirada solo entre estas dos unidades.',
  };
  const explain = explainMap[r.rule] || '';
  const winnerColor = winnerCiv ? `var(--${winnerCiv.color})` : 'var(--on-surface)';

  const actionsHtml = r.winner === 'empate'
    ? `<button class="roll-trigger" style="min-height:64px;font-size:15px" onclick="App.repeatTie()">${icon('dice', 22)}Repetir tirada</button>`
    : `<div class="row" style="justify-content:space-between;gap:8px;margin-top:8px">
        <button class="action-btn" style="flex:1;min-height:40px;flex-direction:row" onclick="App.undoLast()">${icon('undo', 16)}<span class="lbl">Deshacer</span></button>
        <button class="action-btn" style="flex:1;min-height:40px;flex-direction:row" onclick="App.endCombat()">${icon('flag', 16)}<span class="lbl">Fin combate</span></button>
      </div>`;

  return `
    <div style="padding:8px 16px 10px">
      <div class="result-center-line" style="transform:rotate(180deg);color:${winnerColor}">${icon('sword', 14)}${headline}${icon('sword', 14)}</div>
      <div class="row" style="justify-content:center;gap:10px;margin:4px 0">
        <div style="flex:1;height:1px;background:var(--outline-variant)"></div>
        <span style="color:var(--primary)">${icon('sword', 16)}</span>
        <div style="flex:1;height:1px;background:var(--outline-variant)"></div>
      </div>
      <div class="result-center-line" style="color:${winnerColor}">${icon('crown', 14)}${headline}${icon('crown', 14)}</div>
      <div class="rule-toggle"><button onclick="App.toggleRuleExplain()">${state.ruleExpanded ? 'Ocultar explicación' : '¿Por qué se resolvió así?'}</button></div>
      ${state.ruleExpanded ? `<div class="rule-explain">${explain}</div>` : ''}
      ${actionsHtml}
      ${historyPull}
    </div>`;
}

// ---------- Overlays: historial y ajustes ----------
function renderOverlays() {
  let html = '';
  if (state.drawerOpen) html += renderHistoryDrawer();
  if (state.settingsOpen) html += renderSettingsModal();
  if (state.abilityCard) html += renderAbilityCard();
  return html;
}

function renderHistoryDrawer() {
  const items = state.history.slice().reverse().map((h, i) => `
    <div class="history-item">
      <div class="row-between"><strong>#${state.history.length - i}</strong><span class="num">${h.regla}</span></div>
      <div>${h.unidadA} (${h.puntajeA}) vs ${h.unidadB} (${h.puntajeB}) — ${h.resultado}</div>
    </div>`).join('') || `<div class="muted" style="padding:20px 0;text-align:center">Sin tiradas todavía.</div>`;
  return `<div class="drawer">
    <div class="backdrop" onclick="App.closeHistory()"></div>
    <div class="sheet">
      <div class="row-between" style="margin-bottom:8px">
        <strong>Historial de tiradas</strong>
        <button class="icon-btn" onclick="App.closeHistory()">${icon('close', 14)}</button>
      </div>
      ${items}
      ${state.history.length ? `<button class="big-btn" style="margin-top:10px;background:var(--surface-container-high)" onclick="App.clearHistory()">Limpiar</button>` : ''}
    </div>
  </div>`;
}

function renderSettingsModal() {
  const s = state.settings;
  const seg = (options, current, onclick) => `<div class="segmented">${options.map(([val, label]) => `<button class="${current === val ? 'active' : ''}" onclick="${onclick}('${val}')">${label}</button>`).join('')}</div>`;
  const sw = (on, onclick) => `<button class="switch ${on ? 'on' : ''}" onclick="${onclick}"><span class="knob"></span></button>`;
  return `<div class="modal">
    <div class="backdrop" onclick="App.closeSettings()"></div>
    <div class="sheet">
      <div class="row-between" style="margin-bottom:10px">
        <strong style="font-size:16px">Ajustes de mesa</strong>
        <button class="icon-btn" onclick="App.closeSettings()">${icon('close', 14)}</button>
      </div>
      <div class="settings-section">
        <h3>Reglas de mesa</h3>
        <div class="settings-row stacked"><span>Resolución de empate</span>${seg([['repetir', 'Repetir'], ['defensor', 'Gana defensor']], s.tieRule, 'App.setTieRule')}</div>
        <div class="settings-row"><span>Reglas de dobles (Medusa / Berserker)</span>${sw(s.doublesRulesOn, "App.toggleSetting('doublesRulesOn')")}</div>
        <div class="settings-row"><span>Vista de un solo lado</span>${sw(s.singleView, "App.toggleSetting('singleView')")}</div>
      </div>
      <div class="settings-section">
        <h3>Experiencia sensorial</h3>
        <div class="settings-row"><span>Respuesta háptica</span>${sw(s.haptics, "App.toggleSetting('haptics')")}</div>
        <div class="settings-row"><span>Sonido de dados</span>${sw(s.sound, "App.toggleSetting('sound')")}</div>
        <div class="settings-row"><span>Tiradas instantáneas</span>${sw(s.instantRolls, "App.toggleSetting('instantRolls')")}</div>
      </div>
      <div class="settings-section">
        <h3>Apariencia</h3>
        <div class="settings-row stacked"><span>Tema</span>${seg([['oscuro', 'Oscuro'], ['claro', 'Claro'], ['auto', 'Auto']], s.theme, 'App.setTheme')}</div>
      </div>
      <button class="big-btn" style="background:var(--primary);color:var(--on-primary)" onclick="App.closeSettings()">Guardar y volver</button>
      <div class="muted" style="text-align:center;font-size:11px;margin-top:8px">Combate 2d6 • Reglas oficiales AoM Boardgame</div>
    </div>
  </div>`;
}

function renderAbilityCard() {
  const u = state.abilityCard;
  return `<div class="modal">
    <div class="backdrop" onclick="App.closeAbilityCard()"></div>
    <div class="sheet" style="max-height:40vh">
      <div class="row-between" style="margin-bottom:8px">
        <strong>${u.unidad}</strong>
        <button class="icon-btn" onclick="App.closeAbilityCard()">${icon('close', 14)}</button>
      </div>
      <div class="muted" style="font-size:13px">${u.habilidad || 'Sin habilidad especial más allá de su valor de tabla.'}</div>
    </div>
  </div>`;
}

// ---------- Acciones ----------
const App = {
  selectCiv(side, civ) {
    const other = state.players[otherSide(side)];
    if (other.civ === civ) return;
    state.players[side].civ = civ;
    render();
  },
  toggleCivReady(side) {
    const p = state.players[side];
    if (!p.civ) return;
    p.ready = !p.ready;
    if (state.players.A.ready && state.players.B.ready) {
      state.screen = 'unidad';
      state.players.A.revealed = false;
      state.players.B.revealed = false;
    }
    render();
  },
  selectUnit(side, unidad) {
    const p = state.players[side];
    const u = findUnit(p.civ, unidad);
    if (!u) return;
    p.unidad = u.unidad; p.tipo = u.tipo; p.habilidad = u.habilidad; p.berserkBonus = u.berserk_bonus;
    render();
  },
  toggleUnitReady(side) {
    const p = state.players[side];
    if (!p.unidad) return;
    p.unitReady = !p.unitReady;
    if (state.players.A.unitReady && state.players.B.unitReady) {
      state.screen = 'combate';
      state.lastResult = null;
      state.players.A.die1 = state.players.A.die2 = null;
      state.players.B.die1 = state.players.B.die2 = null;
    }
    render();
  },
  toggleHiddenSelection() { state.hiddenSelection = !state.hiddenSelection; if (!state.hiddenSelection) { state.players.A.revealed = true; state.players.B.revealed = true; } render(); },
  revealSide(side) { state.players[side].revealed = true; render(); },
  _longPressTimer: null,
  startLongPress(civ, unidad) {
    App._longPressTimer = setTimeout(() => { state.abilityCard = findUnit(civ, unidad); render(); }, 300);
  },
  cancelLongPress() { clearTimeout(App._longPressTimer); },
  closeAbilityCard() { state.abilityCard = null; render(); },

  toggleMod(side, key) {
    const p = state.players[side];
    if (key === 'wall') p.wall = !p.wall;
    if (key === 'throw') { if (!state.players[otherSide(side)].wall) return; p.throwOn = !p.throwOn; }
    if (key === 'berserk') p.berserkActive = !p.berserkActive;
    render();
  },
  adjustMod(side, delta) {
    const p = state.players[side];
    p.manualMod = Math.max(-3, Math.min(3, p.manualMod + delta));
    render();
  },
  adjustCounter(side, key, delta) {
    const p = state.players[side];
    p[key] = Math.max(0, p[key] + delta);
    render();
  },
  rollDice() {
    if (rollingAnim) return;
    const a = state.players.A, b = state.players.B;
    const row = getMatchup(a, b);
    if (!row) return;
    const rand6 = () => Math.floor(Math.random() * 6) + 1;
    const finalA1 = rand6(), finalA2 = rand6(), finalB1 = rand6(), finalB2 = rand6();
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const skipAnim = state.settings.instantRolls || reducedMotion || typeof Matter === 'undefined';

    vibrate(30);
    playDiceSound();

    const land = () => {
      a.die1 = finalA1; a.die2 = finalA2; b.die1 = finalB1; b.die2 = finalB2;
      resolveAndShow();
    };

    if (skipAnim) { land(); return; }

    rollingAnim = true;
    render(); // dibuja los dados reales atenuados/en reposo (quedan "debajo" del overlay)
    const colorA = civColorHex(a.civ), colorB = civColorHex(b.civ);
    runDiceCollision(
      [
        { value: finalA1, color: colorA }, { value: finalA2, color: colorA },
        { value: finalB1, color: colorB }, { value: finalB2, color: colorB },
      ],
      () => { rollingAnim = false; land(); }
    );
  },
  repeatTie() {
    state.lastResult = null; state.ruleExpanded = false;
    state.players.A.die1 = state.players.A.die2 = null;
    state.players.B.die1 = state.players.B.die2 = null;
    render();
  },
  toggleRuleExplain() { state.ruleExpanded = !state.ruleExpanded; render(); },
  undoLast() {
    if (!state.undoSnapshot) return;
    state.players = state.undoSnapshot.players;
    state.lastResult = null;
    state.history.pop();
    state.undoSnapshot = null;
    render();
  },
  sameUnitAgain(side) {
    state.lastResult = null; state.ruleExpanded = false;
    state.players.A.die1 = state.players.A.die2 = null;
    state.players.B.die1 = state.players.B.die2 = null;
    render();
  },
  changeUnit(side) {
    state.players[side].unitReady = false;
    state.players[side].wall = false; state.players[side].throwOn = false; state.players[side].berserkActive = false; state.players[side].manualMod = 0;
    state.screen = 'unidad';
    state.lastResult = null; state.ruleExpanded = false;
    render();
  },
  retireSide(side) {
    state.players[side].retired = true;
    App.endCombat();
  },
  endCombat() {
    state.screen = 'civ';
    state.players = { A: freshPlayer(), B: freshPlayer() };
    state.lastResult = null; state.ruleExpanded = false; state.undoSnapshot = null;
    render();
  },
  openHistory() { state.drawerOpen = true; render(); },
  closeHistory() { state.drawerOpen = false; render(); },
  clearHistory() { state.history = []; render(); },
  openSettings() { state.settingsOpen = true; render(); },
  closeSettings() { state.settingsOpen = false; render(); },
  setTieRule(v) { state.settings.tieRule = v; render(); },
  setTheme(v) { state.settings.theme = v; render(); },
  toggleSetting(key) { state.settings[key] = !state.settings[key]; render(); },
};
window.App = App;

function resolveAndShow() {
  const a = state.players.A, b = state.players.B;
  const totalA = tableTotalFor(a, b), totalB = tableTotalFor(b, a);
  const cfgA = Object.assign({ die1: a.die1, die2: a.die2 }, buildSideConfig(a, totalA));
  const cfgB = Object.assign({ die1: b.die1, die2: b.die2 }, buildSideConfig(b, totalB));
  state.undoSnapshot = { players: JSON.parse(JSON.stringify(state.players)) };
  const result = resolveCombat(cfgA, cfgB, { tieRule: state.settings.tieRule, defenderSide: state.settings.defenderSide });
  state.lastResult = result;
  state.ruleExpanded = false;
  if (result.winner === 'A' && a.unidad === 'Hydra') a.hydraCount += 1;
  if (result.winner === 'B' && b.unidad === 'Hydra') b.hydraCount += 1;
  if (result.winner === 'A' && a.unidad === 'Valkyrie') a.valkyrieCount += 1;
  if (result.winner === 'B' && b.unidad === 'Valkyrie') b.valkyrieCount += 1;
  if (result.winner !== 'empate') {
    state.history.push({
      unidadA: a.unidad, unidadB: b.unidad,
      puntajeA: result.a.score, puntajeB: result.b.score,
      resultado: result.winner === 'A' ? `Gana ${a.unidad}` : `Gana ${b.unidad}`,
      regla: result.rule,
    });
  }
  render();
}

// ---------- Registro de Service Worker (PWA offline) ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sin SW seguimos funcionando online */ });
  });
}

requestWakeLock();
render();
