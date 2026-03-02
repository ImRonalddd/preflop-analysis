import type {
  ParsedHand, PreflopAction, PreflopDecision, HandCombo, Card, Rank,
  PlayerPreflopStats, RawPreflopAction, PlayerAlias,
} from '@/types';
import { RANK_VALUES, RANKS } from '@/types';
import { assignPositions } from './positions';

// ---------------------------------------------------------------------------
// Action classification
// ---------------------------------------------------------------------------

/**
 * Classify a raw preflop action into a semantic PreflopAction.
 *
 * Raise count tracking:
 *   0 raises so far -> next raise = open_raise
 *   1 raise so far  -> next raise = 3bet
 *   2 raises so far -> next raise = 4bet
 *   3+ raises so far -> next raise = 5bet_plus
 *
 * Limp = calling the BB (or straddle) with no prior raise.
 * BB check = NOT VPIP.
 */
function classifyAction(
  raw: RawPreflopAction,
  raiseCount: number,
  effectiveBB: number,
  isBBPlayer: boolean,
  isStraddlePlayer: boolean,
): { action: PreflopAction; raiseBB: number } | null {
  // Skip blind posts
  if (raw.type === 'post_blind' || raw.type === 'post_straddle') {
    return null;
  }

  // BB check (or straddle check) = not VPIP, skip from decisions
  if (raw.type === 'check') {
    if (isBBPlayer || isStraddlePlayer) {
      return null; // BB/straddle check excluded
    }
    // Unusual check preflop by non-BB - treat as fold equivalent
    return { action: 'fold', raiseBB: 0 };
  }

  if (raw.type === 'fold') {
    return { action: 'fold', raiseBB: 0 };
  }

  if (raw.type === 'call') {
    if (raw.isAllIn) {
      return { action: 'all_in', raiseBB: raw.amount / effectiveBB };
    }
    if (raiseCount === 0) {
      // Calling the BB/straddle with no raise = limp
      return { action: 'limp', raiseBB: 0 };
    }
    if (raiseCount === 1) {
      // Calling an open raise
      return { action: 'call_open', raiseBB: 0 };
    }
    if (raiseCount === 2) {
      // Calling a 3-bet
      return { action: 'call_3bet', raiseBB: 0 };
    }
    // Calling a 4-bet or higher
    return { action: 'call_4bet_plus', raiseBB: 0 };
  }

  if (raw.type === 'raise') {
    const raiseBB = raw.amount / effectiveBB;

    if (raw.isAllIn) {
      return { action: 'all_in', raiseBB };
    }

    if (raiseCount === 0) {
      return { action: 'open_raise', raiseBB };
    } else if (raiseCount === 1) {
      return { action: '3bet', raiseBB };
    } else if (raiseCount === 2) {
      return { action: '4bet', raiseBB };
    } else {
      return { action: '5bet_plus', raiseBB };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Hand combo normalization
// ---------------------------------------------------------------------------

export function cardsToCombo(cards: Card[]): HandCombo | null {
  if (cards.length !== 2) return null;

  const [c1, c2] = cards;
  const v1 = RANK_VALUES[c1.rank];
  const v2 = RANK_VALUES[c2.rank];

  // Higher rank first
  const rank1: Rank = v1 >= v2 ? c1.rank : c2.rank;
  const rank2: Rank = v1 >= v2 ? c2.rank : c1.rank;
  const suited = c1.suit === c2.suit;

  return { rank1, rank2, suited };
}

export function comboToLabel(combo: HandCombo): string {
  const r1 = combo.rank1 === '10' ? 'T' : combo.rank1;
  const r2 = combo.rank2 === '10' ? 'T' : combo.rank2;

  if (combo.rank1 === combo.rank2) {
    return `${r1}${r2}`;
  }
  return `${r1}${r2}${combo.suited ? 's' : 'o'}`;
}

// ---------------------------------------------------------------------------
// Extract preflop decisions from a parsed hand
// ---------------------------------------------------------------------------

export function extractDecisions(
  hand: ParsedHand,
  positionMap: Map<string, string>,
): PreflopDecision[] {
  const decisions: PreflopDecision[] = [];
  const effectiveBB = hand.straddleAmount > 0 ? hand.straddleAmount : hand.bigBlind;

  // Find BB and straddle player names
  const bbPlayer = hand.preflopActions.find(
    a => a.type === 'post_blind' && a.amount === hand.bigBlind
  )?.playerName ?? null;

  let raiseCount = 0;

  for (const raw of hand.preflopActions) {
    const isBB = raw.playerName === bbPlayer;
    const isStraddle = raw.playerName === hand.straddlePlayer;

    const classified = classifyAction(raw, raiseCount, effectiveBB, isBB, isStraddle);
    if (!classified) continue;

    // Track raise count
    if (raw.type === 'raise') {
      raiseCount++;
    }

    const position = positionMap.get(raw.playerName);
    const cards = hand.showdownCards.get(raw.playerName) ?? null;
    const combo = cards ? cardsToCombo(cards) : null;

    decisions.push({
      playerName: raw.playerName,
      playerId: raw.playerId,
      handNumber: hand.handNumber,
      handId: hand.id,
      position: (position as PreflopDecision['position']) ?? 'UTG',
      action: classified.action,
      raiseAmount: raw.amount,
      raiseBB: classified.raiseBB,
      cards,
      combo,
      stakeLevel: hand.stakeLevel,
      timestamp: hand.timestamp,
    });
  }

  return decisions;
}

// ---------------------------------------------------------------------------
// Analyze all players across all hands
// ---------------------------------------------------------------------------

export interface AnalysisResult {
  decisions: PreflopDecision[];
  playerStats: Map<string, PlayerPreflopStats>;
  allPlayers: string[];
  allStakeLevels: string[];
}

export function analyzeAllHands(
  hands: ParsedHand[],
  aliases: PlayerAlias[],
): AnalysisResult {
  const allDecisions: PreflopDecision[] = [];
  const playerHandCounts = new Map<string, number>();
  const allPlayerSet = new Set<string>();
  const allStakeLevelSet = new Set<string>();

  // Auto-merge: build ID -> names map from hand data, pick most frequent name
  const idNameCounts = new Map<string, Map<string, number>>();
  for (const hand of hands) {
    for (const player of hand.players) {
      if (!player.id) continue;
      let nameMap = idNameCounts.get(player.id);
      if (!nameMap) { nameMap = new Map(); idNameCounts.set(player.id, nameMap); }
      nameMap.set(player.name, (nameMap.get(player.name) ?? 0) + 1);
    }
  }

  // For IDs with multiple names, pick most common as primary
  const autoAlias = new Map<string, string>(); // lowercase name -> primary name
  for (const [, nameMap] of idNameCounts) {
    if (nameMap.size <= 1) continue;
    // Most frequent name becomes primary
    let primary = '';
    let maxCount = 0;
    for (const [name, count] of nameMap) {
      if (count > maxCount) { maxCount = count; primary = name; }
    }
    for (const [name] of nameMap) {
      autoAlias.set(name.toLowerCase(), primary);
    }
  }

  // Build alias map: manual aliases override auto-detected ones
  const aliasToPrimary = new Map<string, string>(autoAlias);
  for (const entry of aliases) {
    aliasToPrimary.set(entry.primaryName.toLowerCase(), entry.primaryName);
    for (const alias of entry.aliases) {
      aliasToPrimary.set(alias.toLowerCase(), entry.primaryName);
    }
  }

  const resolveName = (name: string): string => {
    return aliasToPrimary.get(name.toLowerCase()) ?? name;
  };

  for (const hand of hands) {
    // Assign positions
    const positionMap = assignPositions(
      hand.players.map(p => ({ name: p.name, seatNumber: p.seatNumber })),
      hand.dealerSeat,
      hand.isDeadButton,
      hand.straddlePlayer,
    );

    // Count each player's participation
    for (const player of hand.players) {
      const resolved = resolveName(player.name);
      playerHandCounts.set(resolved, (playerHandCounts.get(resolved) ?? 0) + 1);
      allPlayerSet.add(resolved);
    }

    allStakeLevelSet.add(hand.stakeLevel);

    // Extract decisions
    const decisions = extractDecisions(hand, positionMap);
    for (const d of decisions) {
      const resolved = resolveName(d.playerName);
      allDecisions.push({ ...d, playerName: resolved });
    }
  }

  // Compute per-player stats
  const playerStats = new Map<string, PlayerPreflopStats>();

  for (const [playerName, totalHands] of playerHandCounts) {
    const playerDecisions = allDecisions.filter(d => d.playerName === playerName);
    const stats = computePlayerStats(playerName, playerDecisions, totalHands);
    playerStats.set(playerName, stats);
  }

  return {
    decisions: allDecisions,
    playerStats,
    allPlayers: Array.from(allPlayerSet).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    ),
    allStakeLevels: Array.from(allStakeLevelSet).sort(),
  };
}

// ---------------------------------------------------------------------------
// Compute stats for a single player
// ---------------------------------------------------------------------------

function computePlayerStats(
  playerName: string,
  decisions: PreflopDecision[],
  totalHands: number,
): PlayerPreflopStats {
  let vpipHands = 0;
  let pfrHands = 0;
  let threeBetHands = 0;
  let limpHands = 0;
  let foldToThreeBetHands = 0;
  let foldToThreeBetOpportunities = 0;
  let totalRaiseBB = 0;
  let raiseCount = 0;
  let showdownHands = 0;

  const seenHands = new Set<string>();

  for (const d of decisions) {
    // VPIP: voluntarily put money in pot (excludes BB check, includes limp/call/raise/3bet/4bet/5bet/all-in)
    const isVPIP = d.action !== 'fold';
    if (isVPIP) vpipHands++;

    // PFR: preflop raise (open_raise, 3bet, 4bet, 5bet_plus, all-in with raise)
    const isPFR = ['open_raise', '3bet', '4bet', '5bet_plus', 'all_in'].includes(d.action);
    if (isPFR) pfrHands++;

    // 3-bet
    if (d.action === '3bet') threeBetHands++;

    // Limp
    if (d.action === 'limp') limpHands++;

    // Raise sizing
    if (d.raiseBB > 0) {
      totalRaiseBB += d.raiseBB;
      raiseCount++;
    }

    // Showdown
    if (d.cards && !seenHands.has(d.handId)) {
      showdownHands++;
      seenHands.add(d.handId);
    }

    // Fold to 3-bet: player open-raised and then someone 3-bet them
    // We'd need to track hand sequences for this - simplified approach
    // Track in a second pass below
  }

  // Fold to 3-bet analysis: find hands where player open-raised
  // Group decisions by hand
  const handDecisionMap = new Map<string, PreflopDecision[]>();
  for (const d of decisions) {
    const existing = handDecisionMap.get(d.handId) ?? [];
    existing.push(d);
    handDecisionMap.set(d.handId, existing);
  }

  // For fold-to-3bet, we need ALL decisions in the hand, not just this player's
  // This is a limitation - we'd need cross-player data. Skip for now.
  // TODO: Implement fold-to-3bet with full hand context

  return {
    playerName,
    totalHands,
    vpipHands,
    vpipPct: totalHands > 0 ? (vpipHands / totalHands) * 100 : 0,
    pfrHands,
    pfrPct: totalHands > 0 ? (pfrHands / totalHands) * 100 : 0,
    threeBetHands,
    threeBetPct: totalHands > 0 ? (threeBetHands / totalHands) * 100 : 0,
    limpHands,
    limpPct: totalHands > 0 ? (limpHands / totalHands) * 100 : 0,
    foldToThreeBetHands,
    foldToThreeBetOpportunities,
    foldToThreeBetPct: 0,
    avgRaiseBB: raiseCount > 0 ? totalRaiseBB / raiseCount : 0,
    showdownHands,
  };
}

// ---------------------------------------------------------------------------
// Filter decisions
// ---------------------------------------------------------------------------

export function filterDecisions(
  decisions: PreflopDecision[],
  filters: {
    playerName?: string;
    stakeLevel?: string;
    position?: string;
  },
): PreflopDecision[] {
  return decisions.filter(d => {
    if (filters.playerName && d.playerName !== filters.playerName) return false;
    if (filters.stakeLevel && d.stakeLevel !== filters.stakeLevel) return false;
    if (filters.position && d.position !== filters.position) return false;
    return true;
  });
}
