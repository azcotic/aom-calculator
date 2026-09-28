// Validación independiente de probabilidades — §4 y §9 de prompt.md.
// Ejecutar con: node test/enumerate.mjs
import { resolveCombat } from '../engine.js';
import { ENFRENTAMIENTOS } from '../data.js';

function findMatchup(civA, unidadA, civB, unidadB) {
  const row = ENFRENTAMIENTOS.find(
    (r) => r.civ_a === civA && r.unidad_a === unidadA && r.civ_b === civB && r.unidad_b === unidadB
  );
  if (!row) throw new Error(`No se encontró enfrentamiento ${civA} ${unidadA} vs ${civB} ${unidadB}`);
  return row;
}

// Enumeración ESCRITA APARTE del engine (no reutiliza enumerateProbabilities),
// para detectar desacuerdos reales entre dos implementaciones independientes.
function independentEnumerate(sideAConfig, sideBConfig, options = {}) {
  let winsA = 0, winsB = 0, ties = 0;
  for (let a1 = 1; a1 <= 6; a1++) {
    for (let a2 = 1; a2 <= 6; a2++) {
      for (let b1 = 1; b1 <= 6; b1++) {
        for (let b2 = 1; b2 <= 6; b2++) {
          const r = resolveCombat(
            { ...sideAConfig, die1: a1, die2: a2 },
            { ...sideBConfig, die1: b1, die2: b2 },
            options
          );
          if (r.winner === 'A') winsA++;
          else if (r.winner === 'B') winsB++;
          else if (r.winner === 'empate') ties++;
          else throw new Error(`Ganador inesperado: ${r.winner}`);
        }
      }
    }
  }
  const totalCombos = 1296;
  if (winsA + winsB + ties !== totalCombos) {
    throw new Error(`Conteo incompleto: ${winsA + winsB + ties} != 1296`);
  }
  return { winsA, winsB, ties, totalCombos };
}

function pct(n, total) {
  return ((n / total) * 100).toFixed(2) + '%';
}

function report(title, { winsA, winsB, ties, totalCombos }) {
  const efectivoA = winsA + winsB > 0 ? (winsA / (winsA + winsB)) * 100 : 50;
  const efectivoB = winsA + winsB > 0 ? (winsB / (winsA + winsB)) * 100 : 50;
  console.log(`\n=== ${title} ===`);
  console.log(`Gana A: ${winsA}/${totalCombos} = ${pct(winsA, totalCombos)}`);
  console.log(`Empate real: ${ties}/${totalCombos} = ${pct(ties, totalCombos)}`);
  console.log(`Gana B: ${winsB}/${totalCombos} = ${pct(winsB, totalCombos)}`);
  console.log(`Efectivo (repitiendo empates): A ${efectivoA.toFixed(1)}% - B ${efectivoB.toFixed(1)}%`);
}

let failures = 0;
function assertClose(label, actual, expected, tolerance) {
  const diff = Math.abs(actual - expected);
  const ok = diff <= tolerance;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}: esperado ${expected}, obtenido ${actual.toFixed(4)} (tolerancia ${tolerance})`);
  if (!ok) failures++;
}

// --- Caso (a): dos unidades con totales iguales y sin habilidades -> empate real 146/1296 = 11.27% ---
{
  const sideA = { tableTotal: 5, modifiers: [], medusa: false, berserkActive: false };
  const sideB = { tableTotal: 5, modifiers: [], medusa: false, berserkActive: false };
  const res = independentEnumerate(sideA, sideB);
  report('Caso (a): totales iguales (5 vs 5), sin habilidades', res);
  assertClose('Caso (a) empates reales', res.ties, 146, 0);
  assertClose('Caso (a) % empate real', (res.ties / res.totalCombos) * 100, 11.27, 0.01);
}

// --- Caso (b): Anubite (Egipto, total 9) vs Centaur (Griegos, total 5) -> ~84.1% / 6.2% / 9.7% ---
{
  const row = findMatchup('Egipto', 'Anubite', 'Griegos', 'Centaur');
  const sideA = { tableTotal: row.total_a, modifiers: [], medusa: false, berserkActive: false };
  const sideB = { tableTotal: row.total_b, modifiers: [], medusa: false, berserkActive: false };
  const res = independentEnumerate(sideA, sideB);
  report(`Caso (b): Anubite (${row.total_a}) vs Centaur (${row.total_b})`, res);
  assertClose('Caso (b) % gana Anubite', (res.winsA / res.totalCombos) * 100, 84.1, 0.5);
  assertClose('Caso (b) % empate', (res.ties / res.totalCombos) * 100, 6.2, 0.5);
  assertClose('Caso (b) % gana Centaur', (res.winsB / res.totalCombos) * 100, 9.7, 0.5);
}

// --- Caso (c): Son of Osiris (Egipto, 8) vs Mythical Hero (Griegos, 13) ---
{
  const row = findMatchup('Egipto', 'Son of Osiris', 'Griegos', 'Mythical Hero');
  const sideA = { tableTotal: row.total_a, modifiers: [], medusa: false, berserkActive: false };
  const sideB = { tableTotal: row.total_b, modifiers: [], medusa: false, berserkActive: false };
  const res = independentEnumerate(sideA, sideB);
  report(`Caso (c): Son of Osiris (${row.total_a}) vs Mythical Hero (${row.total_b})`, res);
}

// --- Caso (d): Nidhogg (Nórdicos, 11) vs Medusa (Griegos, 5) — Medusa gana empates y dobles ---
{
  const row = findMatchup('Nordicos', 'Nidhogg', 'Griegos', 'Medusa');
  const sideA = { tableTotal: row.total_a, modifiers: [], medusa: false, berserkActive: false };
  const sideB = { tableTotal: row.total_b, modifiers: [], medusa: true, berserkActive: false };
  const res = independentEnumerate(sideA, sideB);
  report(`Caso (d): Nidhogg (${row.total_a}) vs Medusa (${row.total_b}, gana empates/dobles)`, res);
  // Sin regla de Medusa, esta diferencia de 6 puntos ya no daría empates reales salvo... comprobamos
  // que efectivamente no queden empates reales (Medusa absorbe todos los empates de puntaje).
  assertClose('Caso (d) sin empates reales (Medusa los absorbe)', res.ties, 0, 0);
}

console.log(failures === 0 ? '\nTodos los casos de validación pasaron.' : `\n${failures} caso(s) fallaron.`);
process.exit(failures === 0 ? 0 : 1);
