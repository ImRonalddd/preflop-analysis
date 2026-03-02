// Quick parser verification test
import { readFileSync } from 'fs';

// Import the parser functions by evaluating the source
// Since this is TypeScript, we'll implement a minimal version for testing

const SUIT_MAP = { '♥': 'h', '♦': 'd', '♣': 'c', '♠': 's' };

function parseCSVLine(line) {
  const fields = [];
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

function detectGameType(startLine) {
  if (/No Limit Texas Hold.?em/i.test(startLine)) return 'nlh';
  if (/Pot Limit Omaha/i.test(startLine)) return 'plo';
  return 'unknown';
}

function parseCard(cardStr) {
  const t = cardStr.trim().replace(/\.$/, '');
  const suitChar = t[t.length - 1];
  const suit = SUIT_MAP[suitChar];
  let rank = t.slice(0, t.length - 1).trim();
  if (rank === 'T') rank = '10';
  return { rank, suit };
}

function collectShowdownCards(lines) {
  const cardMap = new Map();
  for (const line of lines) {
    const showMatch = line.match(/^"?(.+?)\s@\s([A-Za-z0-9_-]+)"?\s+shows\s+a\s+(.+)$/);
    if (!showMatch) continue;
    const name = showMatch[1].replace(/^"+/, '');
    const cardsStr = showMatch[3].replace(/\.$/, '');
    try {
      const cards = cardsStr.split(',').map(c => parseCard(c.trim()));
      const existing = cardMap.get(name) || [];
      for (const card of cards) {
        const isDup = existing.some(e => e.rank === card.rank && e.suit === card.suit);
        if (!isDup) existing.push(card);
      }
      cardMap.set(name, existing);
    } catch {}
  }
  const result = new Map();
  for (const [name, cards] of cardMap) {
    if (cards.length === 2) result.set(name, cards);
  }
  return result;
}

function parseFile(filename) {
  const csvText = readFileSync(filename, 'utf-8');
  const lines = csvText.split('\n');

  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = parseCSVLine(line);
    if (fields.length >= 2) entries.push({ entry: fields[0], timestamp: fields[1] || '' });
  }

  const reversed = [...entries].reverse();
  const handGroups = [];
  let current = null;

  for (const entry of reversed) {
    if (entry.entry.startsWith('-- starting hand #')) {
      current = [entry];
    } else if (entry.entry.startsWith('-- ending hand #')) {
      if (current) { current.push(entry); handGroups.push(current); current = null; }
    } else if (current) {
      current.push(entry);
    }
  }

  let nlhCount = 0;
  let ploCount = 0;
  let showdownCount = 0;
  const showdownHands = [];

  for (const group of handGroups) {
    const texts = group.map(e => e.entry);
    const startLine = texts[0];
    const gameType = detectGameType(startLine);

    if (gameType === 'nlh') {
      nlhCount++;
      const showdownCards = collectShowdownCards(texts);
      if (showdownCards.size > 0) {
        showdownCount++;
        const numMatch = startLine.match(/hand #(\d+)/);
        const handNum = numMatch ? parseInt(numMatch[1]) : 0;
        showdownHands.push({ handNum, cards: Object.fromEntries(showdownCards) });
      }
    } else if (gameType === 'plo') {
      ploCount++;
    }
  }

  return { nlhCount, ploCount, totalHands: handGroups.length, showdownCount, showdownHands };
}

// Test all 3 files
const logDir = '../Pokernow Logs/';
const files = [
  'poker_now_log_pglEQobIRy_lzjsmFr-IROXz1.csv',
  'poker_now_log_pgl-odxZLNh2Y-0EA7emx4SvC.csv',
  'poker_now_log_pglJGPPJ0_M4m5v57_8cSt2s6.csv',
];

let totalNlh = 0;
for (const f of files) {
  const result = parseFile(logDir + f);
  console.log(`\n=== ${f} ===`);
  console.log(`Total hands: ${result.totalHands}`);
  console.log(`NLH: ${result.nlhCount}, PLO: ${result.ploCount}`);
  console.log(`Showdown hands: ${result.showdownCount}`);
  totalNlh += result.nlhCount;

  // Show first few showdown hands
  for (const h of result.showdownHands.slice(0, 3)) {
    const cardStr = Object.entries(h.cards)
      .map(([name, cards]) => `${name}: ${cards.map(c => c.rank + c.suit).join('')}`)
      .join(', ');
    console.log(`  Hand #${h.handNum}: ${cardStr}`);
  }
}

console.log(`\n=== TOTAL NLH: ${totalNlh} ===`);

// Verify specific hands from plan:
// Hand #373 (file 3): Bryand raises 6.00 = open_raise, table calls = call, Aleksey raises 28.00 = 3bet
// Hand #374 (file 3): table=J♦,7♦ and Aleksey=J♣,Q♦
const file3 = parseFile(logDir + files[2]);
const hand374 = file3.showdownHands.find(h => h.handNum === 374);
if (hand374) {
  console.log('\n=== Verification: Hand #374 ===');
  console.log(JSON.stringify(hand374.cards, null, 2));
} else {
  console.log('\n=== Hand #374 NOT FOUND ===');
}
