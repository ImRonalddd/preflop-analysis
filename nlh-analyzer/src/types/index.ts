// =============================================================================
// NLH Preflop Analyzer - Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// Card Types
// -----------------------------------------------------------------------------

export type Suit = 'h' | 'd' | 'c' | 's';

export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
}

// -----------------------------------------------------------------------------
// Position Types
// -----------------------------------------------------------------------------

export type Position =
  | 'BTN' | 'SB' | 'BB' | 'STRADDLE'
  | 'UTG' | 'UTG1' | 'MP' | 'MP1'
  | 'LJ' | 'HJ' | 'CO';

// -----------------------------------------------------------------------------
// Preflop Action Types
// -----------------------------------------------------------------------------

export type PreflopAction =
  | 'fold'
  | 'limp'
  | 'open_raise'
  | 'call_open'
  | 'call_3bet'
  | 'call_4bet_plus'
  | '3bet'
  | '4bet'
  | '5bet_plus'
  | 'all_in';

export const ACTION_COLORS: Record<PreflopAction, string> = {
  fold: '#64748b',
  limp: '#a3a339',
  open_raise: '#ef4444',
  call_open: '#22c55e',
  call_3bet: '#15803d',
  call_4bet_plus: '#166534',
  '3bet': '#991b1b',
  '4bet': '#9333ea',
  '5bet_plus': '#c026d3',
  all_in: '#f59e0b',
};

export const ACTION_LABELS: Record<PreflopAction, string> = {
  fold: 'Fold',
  limp: 'Limp',
  open_raise: 'Open Raise',
  call_open: 'Call Open',
  call_3bet: 'Call 3-Bet',
  call_4bet_plus: 'Call 4-Bet+',
  '3bet': '3-Bet',
  '4bet': '4-Bet',
  '5bet_plus': '5-Bet+',
  all_in: 'All-In',
};

// -----------------------------------------------------------------------------
// Hand Combo Types (for matrix)
// -----------------------------------------------------------------------------

export interface HandCombo {
  rank1: Rank;  // Higher rank
  rank2: Rank;  // Lower rank (or same for pairs)
  suited: boolean;
}

export interface PreflopDecision {
  playerName: string;
  playerId: string;
  handNumber: number;
  handId: string;
  position: Position;
  action: PreflopAction;
  raiseAmount: number;       // in chips
  raiseBB: number;           // in big blinds
  cards: Card[] | null;      // only from showdown
  combo: HandCombo | null;   // derived from cards
  stakeLevel: string;
  timestamp: string;
}

// -----------------------------------------------------------------------------
// Matrix Types
// -----------------------------------------------------------------------------

export interface MatrixCell {
  combo: HandCombo;
  label: string;               // e.g. "AKs", "QTo", "JJ"
  actions: Record<PreflopAction, number>;
  totalObservations: number;
  decisions: PreflopDecision[];
}

export type HandMatrix = MatrixCell[][];  // 13x13

// -----------------------------------------------------------------------------
// Parsed Hand Types
// -----------------------------------------------------------------------------

export interface HandPlayer {
  name: string;
  id: string;
  seatNumber: number;
  stack: number;
}

export interface ParsedHand {
  id: string;
  handNumber: number;
  gameType: 'nlh' | 'plo';
  stakeLevel: string;
  smallBlind: number;
  bigBlind: number;
  players: HandPlayer[];
  dealerName: string | null;
  dealerSeat: number | null;
  isDeadButton: boolean;
  straddlePlayer: string | null;
  straddleAmount: number;
  preflopActions: RawPreflopAction[];
  showdownCards: Map<string, Card[]>;
  timestamp: string;
}

export interface RawPreflopAction {
  playerName: string;
  playerId: string;
  type: 'fold' | 'check' | 'call' | 'raise' | 'post_blind' | 'post_straddle';
  amount: number;
  isAllIn: boolean;
}

// -----------------------------------------------------------------------------
// Session & Config Types
// -----------------------------------------------------------------------------

export interface SessionData {
  id: string;
  filename: string;
  uploadedAt: string;
  hands: ParsedHand[];
  nlhHandCount: number;
  ploSkippedCount: number;
  stakeLevels: string[];
  playerNames: string[];
}

export interface PlayerPreflopStats {
  playerName: string;
  totalHands: number;
  vpipHands: number;
  vpipPct: number;
  pfrHands: number;
  pfrPct: number;
  threeBetHands: number;
  threeBetPct: number;
  limpHands: number;
  limpPct: number;
  foldToThreeBetHands: number;
  foldToThreeBetOpportunities: number;
  foldToThreeBetPct: number;
  avgRaiseBB: number;
  showdownHands: number;
}

export interface PlayerAlias {
  primaryName: string;
  aliases: string[];
}

export interface AliasConfig {
  players: PlayerAlias[];
  lastUpdated: string;
}

export interface AppConfig {
  aliasConfig: AliasConfig;
}

// -----------------------------------------------------------------------------
// Rank ordering constant
// -----------------------------------------------------------------------------

export const RANKS: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

export const RANK_VALUES: Record<Rank, number> = {
  'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10,
  '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2,
};
