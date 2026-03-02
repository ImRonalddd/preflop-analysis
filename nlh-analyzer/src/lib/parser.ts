import type {
  Card, Suit, Rank, ParsedHand, HandPlayer, RawPreflopAction,
} from '@/types';

// ---------------------------------------------------------------------------
// CSV Parsing
// ---------------------------------------------------------------------------

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { fields.push(current); current = ''; }
      else current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// ---------------------------------------------------------------------------
// Card Parsing
// ---------------------------------------------------------------------------

const SUIT_MAP: Record<string, Suit> = {
  '♥': 'h', '♦': 'd', '♣': 'c', '♠': 's',
  'h': 'h', 'd': 'd', 'c': 'c', 's': 's',
};

export function parseCard(cardStr: string): Card {
  const t = cardStr.trim().replace(/\.$/, '');
  if (t.length < 2) throw new Error(`Invalid card: "${cardStr}"`);

  const suitChar = t[t.length - 1];
  const suit = SUIT_MAP[suitChar];
  if (!suit) throw new Error(`Invalid suit in card: "${cardStr}"`);

  let rank = t.slice(0, t.length - 1).trim();
  if (rank === 'T') rank = '10';
  return { rank: rank as Rank, suit };
}

// ---------------------------------------------------------------------------
// Player extraction - "name @ id" format
// ---------------------------------------------------------------------------

function extractPlayer(text: string): { name: string; id: string; rest: string } | null {
  const m = text.match(/^"?(.+?)\s@\s([A-Za-z0-9_-]+)"?\s+(.*)/);
  if (!m) return null;
  return { name: m[1], id: m[2], rest: m[3] };
}

function extractPlayerName(text: string): { name: string; id: string } | null {
  const m = text.match(/^"?(.+?)\s@\s([A-Za-z0-9_-]+)"?/);
  if (!m) return null;
  return { name: m[1], id: m[2] };
}

// ---------------------------------------------------------------------------
// Player stacks parsing
// Format: Player stacks: #3 "nick @ id" (874.66) | #4 "joe @ id" (861.88)
// ---------------------------------------------------------------------------

function parsePlayerStacks(line: string): HandPlayer[] {
  const result: HandPlayer[] = [];
  const pattern = /#(\d+)\s+"([^"]+?)"\s+\(([\d.]+)\)/g;
  let match;
  while ((match = pattern.exec(line)) !== null) {
    const seatNumber = parseInt(match[1], 10);
    const fullId = match[2];
    const stack = parseFloat(match[3]);
    const atIdx = fullId.lastIndexOf(' @ ');
    const name = atIdx >= 0 ? fullId.substring(0, atIdx) : fullId;
    const id = atIdx >= 0 ? fullId.substring(atIdx + 3) : '';
    result.push({ name, id, seatNumber, stack });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Game type detection
// ---------------------------------------------------------------------------

type GameType = 'nlh' | 'plo' | 'unknown';

function detectGameType(startLine: string): GameType {
  // Handle various apostrophe types in "Hold'em"
  if (/No Limit Texas Hold.?em/i.test(startLine)) {
    return 'nlh';
  }
  if (/Pot Limit Omaha/i.test(startLine)) {
    return 'plo';
  }
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Dealer extraction
// ---------------------------------------------------------------------------

function extractDealer(startLine: string): { name: string | null; isDeadButton: boolean } {
  if (startLine.includes('(dead button)')) {
    return { name: null, isDeadButton: true };
  }
  const m = startLine.match(/\(dealer:\s*"([^"]+)"\)/);
  if (!m) return { name: null, isDeadButton: false };
  const atIdx = m[1].lastIndexOf(' @ ');
  const name = atIdx >= 0 ? m[1].substring(0, atIdx) : m[1];
  return { name, isDeadButton: false };
}

// ---------------------------------------------------------------------------
// Stake level detection
// ---------------------------------------------------------------------------

function detectStakeLevel(sb: number, bb: number): string {
  // Both are whole numbers (1/2, 2/5, etc.) -> no decimals
  if (Number.isInteger(sb) && Number.isInteger(bb)) {
    return `${sb}/${bb}`;
  }
  // At least one has cents -> use 2 decimal places for both
  const fmt = (n: number) => n.toFixed(2);
  return `${fmt(sb)}/${fmt(bb)}`;
}

// ---------------------------------------------------------------------------
// Showdown card collection
// Handles both formats:
//   "name @ id" shows a J♦, Q♦.    (two cards one line)
//   "name @ id" shows a 10♦.       (single card, accumulate)
// ---------------------------------------------------------------------------

function collectShowdownCards(lines: string[]): Map<string, Card[]> {
  const cardMap = new Map<string, Card[]>();

  for (const line of lines) {
    const showMatch = line.match(/^"?(.+?)\s@\s([A-Za-z0-9_-]+)"?\s+shows\s+a\s+(.+)$/);
    if (!showMatch) continue;

    const name = showMatch[1].replace(/^"+/, '');
    const cardsStr = showMatch[3].replace(/\.$/, '');

    try {
      const cards = cardsStr.split(',').map(c => parseCard(c.trim()));
      const existing = cardMap.get(name) ?? [];
      // Accumulate cards (handles single-card reveals across multiple lines)
      for (const card of cards) {
        // Avoid duplicates
        const isDup = existing.some(e => e.rank === card.rank && e.suit === card.suit);
        if (!isDup) {
          existing.push(card);
        }
      }
      cardMap.set(name, existing);
    } catch {
      // Skip invalid card strings
    }
  }

  // Only keep players with exactly 2 cards (valid NLH hands)
  const result = new Map<string, Card[]>();
  for (const [name, cards] of cardMap) {
    if (cards.length === 2) {
      result.set(name, cards);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export interface ParseResult {
  hands: ParsedHand[];
  nlhCount: number;
  ploSkipped: number;
  stakeLevels: string[];
  playerNames: string[];
}

export function parseFullLog(csvText: string, sessionPrefix?: string): ParseResult {
  const lines = csvText.split('\n');
  if (lines.length === 0) return { hands: [], nlhCount: 0, ploSkipped: 0, stakeLevels: [], playerNames: [] };

  // Parse CSV entries, skip header
  type Entry = { entry: string; timestamp: string };
  const entries: Entry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = parseCSVLine(line);
    if (fields.length >= 2) {
      entries.push({ entry: fields[0], timestamp: fields[1] ?? '' });
    }
  }

  // Reverse for chronological order (CSV is newest-first)
  const reversed = [...entries].reverse();

  // Group into hands
  const handGroups: Entry[][] = [];
  let current: Entry[] | null = null;

  for (const entry of reversed) {
    if (entry.entry.startsWith('-- starting hand #')) {
      current = [entry];
    } else if (entry.entry.startsWith('-- ending hand #')) {
      if (current) {
        current.push(entry);
        handGroups.push(current);
        current = null;
      }
    } else if (current) {
      current.push(entry);
    }
  }

  // Parse each hand
  const results: ParsedHand[] = [];
  let ploSkipped = 0;
  const stakeLevelSet = new Set<string>();
  const playerNameSet = new Set<string>();

  for (const group of handGroups) {
    const texts = group.map(e => e.entry);
    const startLine = texts[0];

    // Detect game type - filter per hand
    const gameType = detectGameType(startLine);
    if (gameType === 'plo' || gameType === 'unknown') {
      if (gameType === 'plo') ploSkipped++;
      continue;
    }

    const parsed = parseHand(texts, group[0].timestamp, sessionPrefix);
    if (parsed) {
      results.push(parsed);
      stakeLevelSet.add(parsed.stakeLevel);
      for (const p of parsed.players) {
        playerNameSet.add(p.name);
      }
    }
  }

  return {
    hands: results,
    nlhCount: results.length,
    ploSkipped,
    stakeLevels: Array.from(stakeLevelSet).sort(),
    playerNames: Array.from(playerNameSet).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    ),
  };
}

// ---------------------------------------------------------------------------
// Parse a single hand
// ---------------------------------------------------------------------------

function parseHand(lines: string[], timestamp: string, sessionPrefix?: string): ParsedHand | null {
  const startLine = lines[0];
  if (!startLine.startsWith('-- starting hand #')) return null;

  // Hand number
  const numMatch = startLine.match(/hand #(\d+)/);
  const handNumber = numMatch ? parseInt(numMatch[1], 10) : 0;
  const prefix = sessionPrefix ? `${sessionPrefix}-` : '';
  const id = `${prefix}hand-${handNumber}`;

  // Dealer
  const dealer = extractDealer(startLine);
  let dealerSeat: number | null = null;

  // Player stacks
  let players: HandPlayer[] = [];
  for (const line of lines) {
    if (line.startsWith('Player stacks:')) {
      players = parsePlayerStacks(line);
      break;
    }
  }

  // Find dealer seat
  if (dealer.name) {
    const dealerPlayer = players.find(p => p.name === dealer.name);
    if (dealerPlayer) {
      dealerSeat = dealerPlayer.seatNumber;
    }
  }

  // For dead button, extract phantom seat from context
  // PokerNow doesn't give us the dead button seat number directly
  // We infer it from the blind posting order
  if (dealer.isDeadButton && players.length > 0) {
    dealerSeat = inferDeadButtonSeat(lines, players);
  }

  // Parse blinds and straddles
  let smallBlind = 0;
  let bigBlind = 0;
  let straddlePlayer: string | null = null;
  let straddleAmount = 0;
  const blindActions: RawPreflopAction[] = [];

  for (const line of lines) {
    if (line.includes('posts a small blind of')) {
      const p = extractPlayer(line);
      if (p) {
        const m = p.rest.match(/posts a small blind of ([\d.]+)/);
        if (m) {
          smallBlind = parseFloat(m[1]);
          blindActions.push({
            playerName: p.name,
            playerId: p.id,
            type: 'post_blind',
            amount: smallBlind,
            isAllIn: false,
          });
        }
      }
    } else if (line.includes('posts a big blind of')) {
      const p = extractPlayer(line);
      if (p) {
        const m = p.rest.match(/posts a big blind of ([\d.]+)/);
        if (m) {
          bigBlind = parseFloat(m[1]);
          blindActions.push({
            playerName: p.name,
            playerId: p.id,
            type: 'post_blind',
            amount: bigBlind,
            isAllIn: false,
          });
        }
      }
    } else if (line.includes('posts a straddle of')) {
      const p = extractPlayer(line);
      if (p) {
        const m = p.rest.match(/posts a straddle of ([\d.]+)/);
        if (m) {
          straddleAmount = parseFloat(m[1]);
          straddlePlayer = p.name;
          blindActions.push({
            playerName: p.name,
            playerId: p.id,
            type: 'post_straddle',
            amount: straddleAmount,
            isAllIn: false,
          });
        }
      }
    }
  }

  const stakeLevel = detectStakeLevel(smallBlind, bigBlind);

  // Extract preflop actions (after blinds, before Flop: or hand end)
  const preflopActions = extractPreflopActions(lines, blindActions);

  // Collect showdown cards
  const showdownCards = collectShowdownCards(lines);

  return {
    id,
    handNumber,
    gameType: 'nlh',
    stakeLevel,
    smallBlind,
    bigBlind,
    players,
    dealerName: dealer.name,
    dealerSeat,
    isDeadButton: dealer.isDeadButton,
    straddlePlayer,
    straddleAmount,
    preflopActions: [...blindActions, ...preflopActions],
    showdownCards,
    timestamp,
  };
}

// ---------------------------------------------------------------------------
// Extract preflop actions (everything between blind posts and Flop/hand end)
// ---------------------------------------------------------------------------

function extractPreflopActions(lines: string[], blindActions: RawPreflopAction[]): RawPreflopAction[] {
  const actions: RawPreflopAction[] = [];

  // Find where blinds/straddles end and preflop action begins
  let preflopStarted = false;
  const blindPlayerNames = new Set(blindActions.map(a => a.playerName));
  let passedBlinds = false;

  for (const line of lines) {
    // Skip non-action lines
    if (line.startsWith('--')) continue;
    if (line.startsWith('Player stacks:')) continue;
    if (line.includes('collected') && line.includes('from pot')) continue;
    if (line.includes('Uncalled bet')) continue;
    if (line.includes('shows a ')) continue;
    if (line.includes('7-2 bounty')) continue;
    if (line.includes('requested a seat')) continue;
    if (line.includes('quits the game')) continue;
    if (line.includes('joined the game')) continue;
    if (line.includes('stand up')) continue;
    if (line.includes('sit back')) continue;
    if (line.includes('sit down')) continue;
    if (line.includes('The admin')) continue;
    if (line.includes('run it twice')) continue;
    if (line.includes('Remaining players decide')) continue;
    if (line.includes('Some players choose')) continue;
    if (line.includes('canceled the seat')) continue;

    // Stop at flop
    if (/^Flop:\s/.test(line)) break;

    // Stop at "River:" or "Turn:" (shouldn't happen preflop but safety)
    if (/^Turn:\s/.test(line) || /^River:\s/.test(line)) break;

    // Skip blind posts (already collected)
    if (line.includes('posts a small blind') || line.includes('posts a big blind') || line.includes('posts a straddle')) {
      passedBlinds = true;
      continue;
    }

    // After blinds, we're in preflop action territory
    if (passedBlinds || preflopStarted) {
      preflopStarted = true;
    } else {
      continue;
    }

    const p = extractPlayer(line);
    if (!p) continue;

    const name = p.name.replace(/^"+/, '');
    const rest = p.rest;
    const isAllIn = rest.includes('all in');

    if (rest.startsWith('folds')) {
      actions.push({ playerName: name, playerId: p.id, type: 'fold', amount: 0, isAllIn: false });
    } else if (rest.startsWith('checks')) {
      actions.push({ playerName: name, playerId: p.id, type: 'check', amount: 0, isAllIn: false });
    } else if (rest.startsWith('calls')) {
      const m = rest.match(/calls\s+([\d.]+)/);
      const amount = m ? parseFloat(m[1]) : 0;
      actions.push({ playerName: name, playerId: p.id, type: 'call', amount, isAllIn });
    } else if (rest.startsWith('raises')) {
      const m = rest.match(/raises\s+to\s+([\d.]+)/);
      const amount = m ? parseFloat(m[1]) : 0;
      actions.push({ playerName: name, playerId: p.id, type: 'raise', amount, isAllIn });
    } else if (rest.startsWith('bets')) {
      // "bets" preflop = raise (open raise)
      const m = rest.match(/bets\s+([\d.]+)/);
      const amount = m ? parseFloat(m[1]) : 0;
      actions.push({ playerName: name, playerId: p.id, type: 'raise', amount, isAllIn });
    }
  }

  return actions;
}

// ---------------------------------------------------------------------------
// Infer dead button seat from blind posting positions
// ---------------------------------------------------------------------------

function inferDeadButtonSeat(lines: string[], players: HandPlayer[]): number | null {
  // With dead button, SB is the first blind poster
  // The dead button seat is one position before SB in the seat ordering
  let sbSeat: number | null = null;

  for (const line of lines) {
    if (line.includes('posts a small blind of')) {
      const p = extractPlayer(line);
      if (p) {
        const player = players.find(pl => pl.name === p.name);
        if (player) {
          sbSeat = player.seatNumber;
          break;
        }
      }
    }
  }

  if (sbSeat === null) {
    // No SB found (possible in some edge cases), try BB
    for (const line of lines) {
      if (line.includes('posts a big blind of')) {
        const p = extractPlayer(line);
        if (p) {
          const player = players.find(pl => pl.name === p.name);
          if (player) {
            // BB is 2 positions after button; approximate
            const sorted = [...players].sort((a, b) => a.seatNumber - b.seatNumber);
            const bbIdx = sorted.findIndex(pl => pl.seatNumber === player.seatNumber);
            if (bbIdx >= 0) {
              // Button is 2 seats before BB (wrapping)
              const btnIdx = (bbIdx - 2 + sorted.length) % sorted.length;
              // Dead button is between the btn seat player and one before
              return sorted[btnIdx].seatNumber - 1;
            }
          }
        }
      }
    }
    return null;
  }

  // Dead button is one seat before SB
  const sorted = [...players].sort((a, b) => a.seatNumber - b.seatNumber);
  const sbIdx = sorted.findIndex(p => p.seatNumber === sbSeat);
  if (sbIdx < 0) return null;

  // Button is one before SB in circular order
  const prevIdx = (sbIdx - 1 + sorted.length) % sorted.length;
  // Dead button seat is between the previous player's seat and SB's seat
  // Use a seat number that's between prev and SB
  const prevSeat = sorted[prevIdx].seatNumber;

  if (prevSeat < sbSeat!) {
    return prevSeat + 1 === sbSeat ? prevSeat - 1 : prevSeat + 1;
  }
  // Wrapping case
  return sbSeat! - 1;
}
