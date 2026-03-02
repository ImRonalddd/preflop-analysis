import type { MatrixCell, HandCombo, PreflopAction, PreflopDecision, Rank } from '@/types';
import { RANKS, RANK_VALUES } from '@/types';
import { comboToLabel } from './analyzer';

/**
 * Build an empty 13x13 hand matrix.
 *
 * Layout:
 *   - Diagonal (row === col): pairs (AA, KK, ...)
 *   - Upper right (row < col): suited hands (AKs, AQs, ...)
 *   - Lower left (row > col): offsuit hands (AKo, AQo, ...)
 *
 * Row index: A=0, K=1, Q=2, ..., 2=12
 * Col index: same
 */
export function buildEmptyMatrix(): MatrixCell[][] {
  const matrix: MatrixCell[][] = [];

  for (let row = 0; row < 13; row++) {
    matrix[row] = [];
    for (let col = 0; col < 13; col++) {
      const rank1 = RANKS[Math.min(row, col)]; // higher rank
      const rank2 = RANKS[Math.max(row, col)]; // lower rank

      let suited: boolean;
      if (row === col) {
        suited = false; // pairs
      } else if (row < col) {
        suited = true;  // upper right = suited
      } else {
        suited = false; // lower left = offsuit
      }

      const combo: HandCombo = { rank1, rank2, suited };

      matrix[row][col] = {
        combo,
        label: comboToLabel(combo),
        actions: {
          fold: 0,
          limp: 0,
          open_raise: 0,
          call_open: 0,
          call_3bet: 0,
          call_4bet_plus: 0,
          '3bet': 0,
          '4bet': 0,
          '5bet_plus': 0,
          all_in: 0,
        },
        totalObservations: 0,
        decisions: [],
      };
    }
  }

  return matrix;
}

/**
 * Get matrix coordinates for a hand combo.
 */
export function getMatrixCoords(combo: HandCombo): { row: number; col: number } {
  const idx1 = RANKS.indexOf(combo.rank1);
  const idx2 = RANKS.indexOf(combo.rank2);

  if (combo.rank1 === combo.rank2) {
    // Pair: on diagonal
    return { row: idx1, col: idx1 };
  }

  // Higher rank has lower index (A=0, K=1, etc.)
  const highIdx = Math.min(idx1, idx2);
  const lowIdx = Math.max(idx1, idx2);

  if (combo.suited) {
    // Suited: upper right (row < col)
    return { row: highIdx, col: lowIdx };
  } else {
    // Offsuit: lower left (row > col)
    return { row: lowIdx, col: highIdx };
  }
}

/**
 * Populate a matrix from showdown decisions.
 */
export function populateMatrix(decisions: PreflopDecision[]): MatrixCell[][] {
  const matrix = buildEmptyMatrix();

  for (const d of decisions) {
    if (!d.combo) continue;

    const { row, col } = getMatrixCoords(d.combo);
    const cell = matrix[row][col];

    cell.actions[d.action]++;
    cell.totalObservations++;
    cell.decisions.push(d);
  }

  return matrix;
}
