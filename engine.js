// Motor de reglas de "Combate 2d6". JS puro, sin DOM — ejecutable en Node o en el navegador.
// No redondea ni corrige ningún número de datos: los totales de tabla vienen tal cual del CSV.

/**
 * Busca la fila de enfrentamiento entre dos unidades de civilizaciones distintas.
 * @param {Array} enfrentamientos - filas de enfrentamientos.csv
 * @returns {{ totalA: number, totalB: number, diff: number } | null}
 */
export function lookupMatchup(enfrentamientos, civA, unidadA, civB, unidadB) {
  const row = enfrentamientos.find(
    (r) => r.civ_a === civA && r.unidad_a === unidadA && r.civ_b === civB && r.unidad_b === unidadB
  );
  if (!row) return null;
  return { totalA: row.total_a, totalB: row.total_b, diff: row.diff };
}

/**
 * Suma los modificadores activos de un lado y calcula el puntaje final de esa tirada.
 * @param {{ tableTotal: number, die1: number, die2: number, modifiers: Array<{id:string,label:string,value:number}> }} side
 */
export function computeSide({ tableTotal, die1, die2, modifiers = [] }) {
  const diceSum = die1 + die2;
  const isDoubles = die1 === die2;
  const modifiersSum = modifiers.reduce((sum, m) => sum + m.value, 0);
  const score = tableTotal + diceSum + modifiersSum;
  return { tableTotal, die1, die2, diceSum, isDoubles, modifiers, modifiersSum, score };
}

// Combina una lista de lados favorecidos ('A'/'B') por efectos de dobles o de empate.
// Sin efectos -> null. Un único lado favorecido -> ese lado. Lados distintos favorecidos
// (contradicción, p.ej. dos Medusas o dos Berserkers) -> 'cancel', se anulan entre sí.
function combineFavors(favors) {
  const set = new Set(favors);
  if (set.size === 0) return null;
  if (set.size === 1) return [...set][0];
  return 'cancel';
}

/**
 * Resuelve un combate ya con dados concretos, siguiendo el orden de §4:
 * 1) efectos de dobles (Medusa gana en dobles, Berserk pierde en dobles) — si el resultado
 *    combinado favorece un único lado, ese lado gana sin comparar puntaje.
 * 2) si no hay efecto de dobles decisivo, gana el puntaje más alto.
 * 3) en empate de puntaje: Medusa gana empates, Berserk pierde empates; si ninguna regla
 *    aplica (o se contradicen) es empate real, resuelto según `options.tieRule`.
 *
 * @param {object} sideA { tableTotal, die1, die2, modifiers, medusa, berserkActive }
 * @param {object} sideB idem
 * @param {{ tieRule?: 'repetir'|'defensor', defenderSide?: 'A'|'B' }} options
 */
export function resolveCombat(sideA, sideB, options = {}) {
  const { tieRule = 'repetir', defenderSide = null } = options;
  const a = computeSide(sideA);
  const b = computeSide(sideB);

  const doublesFavors = [];
  if (a.isDoubles) {
    if (sideA.medusa) doublesFavors.push('A');
    if (sideA.berserkActive) doublesFavors.push('B');
  }
  if (b.isDoubles) {
    if (sideB.medusa) doublesFavors.push('B');
    if (sideB.berserkActive) doublesFavors.push('A');
  }
  const doublesResult = combineFavors(doublesFavors);
  if (doublesResult === 'A' || doublesResult === 'B') {
    const reason = doublesResult === 'A'
      ? (sideA.medusa && a.isDoubles ? 'medusa' : 'berserk-rival')
      : (sideB.medusa && b.isDoubles ? 'medusa' : 'berserk-rival');
    return { a, b, winner: doublesResult, rule: 'dobles', reason };
  }

  if (a.score > b.score) return { a, b, winner: 'A', rule: 'puntaje' };
  if (b.score > a.score) return { a, b, winner: 'B', rule: 'puntaje' };

  // Empate de puntaje.
  const tieFavors = [];
  if (sideA.medusa) tieFavors.push('A');
  if (sideB.medusa) tieFavors.push('B');
  if (sideA.berserkActive) tieFavors.push('B');
  if (sideB.berserkActive) tieFavors.push('A');
  const tieResult = combineFavors(tieFavors);
  if (tieResult === 'A' || tieResult === 'B') {
    const reason = tieResult === 'A'
      ? (sideA.medusa ? 'medusa' : 'berserk-rival')
      : (sideB.medusa ? 'medusa' : 'berserk-rival');
    return { a, b, winner: tieResult, rule: 'empate-habilidad', reason };
  }

  if (tieRule === 'defensor' && defenderSide) {
    return { a, b, winner: defenderSide, rule: 'empate-defensor' };
  }
  return { a, b, winner: 'empate', rule: 'empate-real' };
}

/**
 * Enumera las 36x36 = 1296 combinaciones de dados posibles y cuenta victorias de A, de B
 * y empates reales, usando exactamente `resolveCombat` (misma lógica que una tirada real).
 * @param {object} sideAConfig { tableTotal, modifiers, medusa, berserkActive } (sin dados)
 * @param {object} sideBConfig idem
 * @param {{ tieRule?: 'repetir'|'defensor', defenderSide?: 'A'|'B' }} options
 */
export function enumerateProbabilities(sideAConfig, sideBConfig, options = {}) {
  let winsA = 0;
  let winsB = 0;
  let ties = 0;
  const total = 1296;
  for (let a1 = 1; a1 <= 6; a1++) {
    for (let a2 = 1; a2 <= 6; a2++) {
      for (let b1 = 1; b1 <= 6; b1++) {
        for (let b2 = 1; b2 <= 6; b2++) {
          const result = resolveCombat(
            { ...sideAConfig, die1: a1, die2: a2 },
            { ...sideBConfig, die1: b1, die2: b2 },
            options
          );
          if (result.winner === 'A') winsA++;
          else if (result.winner === 'B') winsB++;
          else ties++;
        }
      }
    }
  }
  const pA = winsA / total;
  const pB = winsB / total;
  const pTie = ties / total;
  const efectivoA = pA + pB > 0 ? pA / (pA + pB) : 0.5;
  const efectivoB = pA + pB > 0 ? pB / (pA + pB) : 0.5;
  return { total, winsA, winsB, ties, pA, pB, pTie, efectivoA, efectivoB };
}
