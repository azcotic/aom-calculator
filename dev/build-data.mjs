// Dev-only tool: converts data/*.csv into data.js verbatim (no rounding).
// Run with: node dev/build-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    // simple CSV parser that handles quoted fields with commas
    const cells = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else { cur += c; }
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { cells.push(cur); cur = ''; }
        else cur += c;
      }
    }
    cells.push(cur);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cells[i]; });
    return obj;
  });
}

const unidadesRaw = parseCsv(readFileSync(join(root, 'data', 'unidades.csv'), 'utf8'));
const enfrentamientosRaw = parseCsv(readFileSync(join(root, 'data', 'enfrentamientos.csv'), 'utf8'));

const unidades = unidadesRaw.map((r) => ({
  civ: r.civ,
  unidad: r.unidad,
  tipo: r.tipo,
  habilidad: r.habilidad || '',
  berserk_bonus: Number(r.berserk_bonus),
}));

const enfrentamientos = enfrentamientosRaw.map((r) => ({
  civ_a: r.civ_a,
  unidad_a: r.unidad_a,
  civ_b: r.civ_b,
  unidad_b: r.unidad_b,
  total_a: Number(r.total_a),
  total_b: Number(r.total_b),
  diff: Number(r.diff),
}));

if (unidades.length !== 35) throw new Error(`Expected 35 unidades, got ${unidades.length}`);
if (enfrentamientos.length !== 816) throw new Error(`Expected 816 enfrentamientos, got ${enfrentamientos.length}`);

const out = `// GENERATED FILE — do not edit by hand. Run \`node dev/build-data.mjs\` to regenerate from data/*.csv.
export const UNIDADES = ${JSON.stringify(unidades)};

export const ENFRENTAMIENTOS = ${JSON.stringify(enfrentamientos)};
`;

writeFileSync(join(root, 'data.js'), out, 'utf8');
console.log(`data.js generado: ${unidades.length} unidades, ${enfrentamientos.length} enfrentamientos.`);
