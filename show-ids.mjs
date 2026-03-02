import { readFileSync } from 'fs';

const files = [
  'Pokernow Logs/poker_now_log_pglEQobIRy_lzjsmFr-IROXz1.csv',
  'Pokernow Logs/poker_now_log_pgl-odxZLNh2Y-0EA7emx4SvC.csv',
  'Pokernow Logs/poker_now_log_pglJGPPJ0_M4m5v57_8cSt2s6.csv',
];

const idToNames = {};
const idCounts = {};
for (const f of files) {
  const text = readFileSync(f, 'utf-8');
  const regex = /"([^"]+?)\s@\s([A-Za-z0-9_-]+)"/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const name = m[1]; const id = m[2];
    if (!idToNames[id]) { idToNames[id] = new Set(); idCounts[id] = {}; }
    idToNames[id].add(name);
    idCounts[id][name] = (idCounts[id][name] || 0) + 1;
  }
}

const sorted = Object.entries(idToNames).map(([id, names]) => {
  const total = Object.values(idCounts[id]).reduce((a,b) => a+b, 0);
  const nameArr = Array.from(names).sort((a,b) => (idCounts[id][b]||0) - (idCounts[id][a]||0));
  return { id, names: nameArr, counts: idCounts[id], total };
}).sort((a,b) => b.total - a.total);

console.log('ID'.padEnd(16), 'Mentions', 'Names (most frequent first)');
console.log('-'.repeat(90));
for (const p of sorted) {
  const nameStr = p.names.map(n => `${n}(${p.counts[n]})`).join(', ');
  const multi = p.names.length > 1 ? ' ***' : '';
  console.log(p.id.padEnd(16), String(p.total).padStart(6) + '  ', nameStr + multi);
}
console.log('');
console.log('Total unique player IDs:', sorted.length);
console.log('IDs with multiple names (marked ***):', sorted.filter(p => p.names.length > 1).length);
