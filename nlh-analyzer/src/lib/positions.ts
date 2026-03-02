import type { Position } from '@/types';

// Position names by table size (seats clockwise from dealer)
// Index 0 = first seat after dealer (or after BB in standard order)
const POSITION_MAPS: Record<number, Position[]> = {
  2: ['BTN', 'BB'],              // HU: BTN = SB
  3: ['BTN', 'SB', 'BB'],
  4: ['UTG', 'BTN', 'SB', 'BB'],
  5: ['UTG', 'CO', 'BTN', 'SB', 'BB'],
  6: ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'],
  7: ['UTG', 'UTG1', 'MP', 'CO', 'BTN', 'SB', 'BB'],
  8: ['UTG', 'UTG1', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  9: ['UTG', 'UTG1', 'MP', 'MP1', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
};

/**
 * Assign positions to players based on seat numbers and dealer position.
 *
 * The dealer button determines positions. We order seats clockwise from
 * the dealer. For dead button, we use the phantom dealer seat (no player sits there).
 *
 * Returns a Map from player name -> Position.
 */
export function assignPositions(
  players: { name: string; seatNumber: number }[],
  dealerSeat: number | null,
  isDeadButton: boolean,
  straddlePlayer: string | null,
): Map<string, Position> {
  const result = new Map<string, Position>();
  if (players.length === 0) return result;

  const sorted = [...players].sort((a, b) => a.seatNumber - b.seatNumber);
  const tableSize = sorted.length;

  const positions = POSITION_MAPS[tableSize];
  if (!positions) {
    // Fallback for unexpected table sizes: just use generic positions
    for (const p of sorted) {
      result.set(p.name, 'UTG');
    }
    return result;
  }

  // Find dealer index in sorted array
  let dealerIdx = -1;
  if (dealerSeat !== null) {
    if (isDeadButton) {
      // Dead button: find where the phantom seat would be inserted
      // The phantom seat doesn't correspond to any player
      // We need to find the position between players where the dealer button sits
      dealerIdx = findInsertionPoint(sorted.map(p => p.seatNumber), dealerSeat);
    } else {
      dealerIdx = sorted.findIndex(p => p.seatNumber === dealerSeat);
    }
  }

  if (dealerIdx < 0 && !isDeadButton) {
    // Fallback: try to find by name match or just use first player
    dealerIdx = 0;
  }

  if (isDeadButton) {
    // Dead button: positions are assigned as if the button is at the phantom seat
    // SB is next player after button, BB is next after SB, etc.
    // For dead button, we skip BTN in the position assignment
    // Actually in PokerNow with dead button: SB is skipped, BB is posted by the
    // player who would be BB, and the button position is empty.
    // The positions still follow the standard order.
    assignDeadButtonPositions(sorted, dealerSeat ?? 0, result);
  } else {
    // Normal button: dealer player gets BTN position
    // Seats after dealer get SB, BB, UTG, etc.
    const btnIdx = dealerIdx >= 0 ? dealerIdx : 0;

    for (let i = 0; i < tableSize; i++) {
      const playerIdx = (btnIdx + i) % tableSize;
      const player = sorted[playerIdx];

      // Position index: BTN is last in the POSITION_MAPS arrays for 3+ players
      // Actually the arrays are ordered starting from first position after dealer
      // Let me redefine: positions[0] = seat after SB going around
      // Actually let me think about this differently.

      // For a 6-max table, the positions in acting order (preflop) are:
      // UTG, MP, CO, BTN, SB, BB
      // The dealer is BTN. So starting from dealer:
      // dealer = BTN, dealer+1 = SB, dealer+2 = BB, dealer+3 = UTG, etc.

      // In POSITION_MAPS, I have them ordered as: UTG, MP, CO, BTN, SB, BB
      // BTN is at index tableSize - 3 (for 3+ players)
      // So for player at offset i from dealer:
      // i=0 -> BTN (index tableSize-3 for 6p)
      // i=1 -> SB (index tableSize-2)
      // i=2 -> BB (index tableSize-1)
      // i=3 -> UTG (index 0)
      // i=4 -> MP (index 1)
      // i=5 -> CO (index 2)

      // General formula: positionIndex = (tableSize - 3 + i) % tableSize for 3+
      // For HU (2p): BTN=index 0, BB=index 1
      let posIdx: number;
      if (tableSize === 2) {
        posIdx = i; // 0=BTN, 1=BB
      } else {
        posIdx = (tableSize - 3 + i) % tableSize;
      }

      result.set(player.name, positions[posIdx]);
    }
  }

  // Override straddle player position
  if (straddlePlayer && result.has(straddlePlayer)) {
    result.set(straddlePlayer, 'STRADDLE');
  }

  return result;
}

function assignDeadButtonPositions(
  sorted: { name: string; seatNumber: number }[],
  deadSeat: number,
  result: Map<string, Position>,
): void {
  const tableSize = sorted.length;
  const positions = POSITION_MAPS[tableSize];
  if (!positions) return;

  // With dead button, the button position is empty.
  // In PokerNow, SB is also skipped when the SB player left.
  // The first player after the dead button posts SB (or it's skipped),
  // next posts BB, then UTG etc.
  // We treat it the same as normal but the BTN seat is phantom.

  // Find the player who would be right after the dead button seat clockwise
  const seats = sorted.map(p => p.seatNumber);
  const insertionIdx = findInsertionPoint(seats, deadSeat);

  // Starting from the player after the dead button
  for (let i = 0; i < tableSize; i++) {
    const playerIdx = (insertionIdx + i) % tableSize;
    const player = sorted[playerIdx];

    // Position: SB is first after button, BB is second, then UTG...
    // In POSITION_MAPS: UTG...CO, BTN, SB, BB
    // SB = index tableSize-2, BB = tableSize-1, UTG = 0, etc.
    let posIdx: number;
    if (tableSize === 2) {
      posIdx = i;
    } else {
      // i=0 -> SB (index tableSize-2)
      // i=1 -> BB (index tableSize-1)
      // i=2 -> UTG (index 0)
      // etc.
      posIdx = (tableSize - 2 + i) % tableSize;
    }

    result.set(player.name, positions[posIdx]);
  }
}

/**
 * Find where a value would be inserted in a sorted array (circular).
 * Returns the index of the first element > value, wrapping around.
 */
function findInsertionPoint(sortedSeats: number[], value: number): number {
  // Find first seat that is greater than value
  for (let i = 0; i < sortedSeats.length; i++) {
    if (sortedSeats[i] > value) return i;
  }
  // Wrap around: all seats are <= value, so insertion point is 0
  return 0;
}
