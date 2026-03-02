/**
 * Build the link tracker HTML page from scraped Discord data
 * and already-downloaded CSV files.
 *
 * Usage: node build-tracker.mjs
 * Output: link-tracker.html
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';

// ---------------------------------------------------------------------------
// 1. Extract all PokerNow links from Discord export
// ---------------------------------------------------------------------------

const data = JSON.parse(readFileSync('ongoing-games.json', 'utf-8'));
const linkRegex = /https?:\/\/(?:www\.)?pokernow\.(?:club|com)\/games\/([A-Za-z0-9_-]+)/g;

const games = [];
const seenIds = new Set();

for (const msg of data.messages) {
  let match;
  while ((match = linkRegex.exec(msg.content)) !== null) {
    const gameId = match[1];
    if (seenIds.has(gameId)) continue;
    seenIds.add(gameId);

    // Try to extract stake info from message
    const stakeMatch = msg.content.match(/(\d+(?:\.\d+)?)\s*[\/\\]\s*(\d+(?:\.\d+)?)/);
    const stakes = stakeMatch ? `${stakeMatch[1]}/${stakeMatch[2]}` : '';

    // Try to detect game type
    const content = msg.content.toLowerCase();
    let gameType = 'NLH';
    if (content.includes('plo') || content.includes('omaha')) gameType = 'PLO';
    if (content.includes('nlh') || content.includes('nlhe') || content.includes("hold'em") || content.includes('holdem')) gameType = 'NLH';
    // Mixed
    if ((content.includes('plo') || content.includes('omaha')) &&
        (content.includes('nlh') || content.includes('nlhe'))) gameType = 'Mixed';

    games.push({
      gameId,
      url: `https://www.pokernow.com/games/${gameId}`,
      date: msg.created_at.substring(0, 10),
      time: msg.created_at.substring(11, 16),
      postedBy: msg.author.display_name || msg.author.username,
      stakes,
      gameType,
      context: msg.content
        .replace(/<@[!&]?\d+>/g, '')  // strip Discord mentions
        .replace(/https?:\/\/\S+/g, '') // strip URLs
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100),
    });
  }
}

// ---------------------------------------------------------------------------
// 2. Check which files are already downloaded
// ---------------------------------------------------------------------------

let downloadedIds = new Set();
try {
  const files = readdirSync('Pokernow Logs');
  for (const f of files) {
    if (f.endsWith('.csv')) {
      // Extract game ID from filename like poker_now_log_pglXXX.csv
      const idMatch = f.match(/poker_now_log_(.+)\.csv/);
      if (idMatch) downloadedIds.add(idMatch[1]);
    }
  }
} catch { /* no logs dir yet */ }

console.log(`Found ${games.length} unique game links`);
console.log(`Already downloaded: ${downloadedIds.size} files`);

// ---------------------------------------------------------------------------
// 3. Build HTML
// ---------------------------------------------------------------------------

const gamesJson = JSON.stringify(games);
const downloadedJson = JSON.stringify(Array.from(downloadedIds));

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>PokerNow Link Tracker</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
    background: #0a0a0b; color: #e4e4e7; padding: 20px;
    font-size: 13px;
  }
  h1 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
  .subtitle { color: #71717a; font-size: 11px; margin-bottom: 20px; }
  .stats {
    display: flex; gap: 20px; margin-bottom: 20px;
    background: #111113; border: 1px solid #2a2a2e; border-radius: 8px;
    padding: 12px 16px;
  }
  .stat-item { text-align: center; }
  .stat-value { font-size: 24px; font-weight: 700; }
  .stat-label { font-size: 10px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; }
  .stat-value.green { color: #4ade80; }
  .stat-value.amber { color: #fbbf24; }
  .stat-value.blue { color: #60a5fa; }

  .filters {
    display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;
  }
  .filters label { font-size: 11px; color: #71717a; }
  .filters input, .filters select {
    background: #111113; border: 1px solid #2a2a2e; border-radius: 4px;
    color: #e4e4e7; padding: 4px 8px; font-size: 12px; font-family: inherit;
  }
  .pill {
    display: inline-block; padding: 3px 10px; border-radius: 12px;
    font-size: 11px; cursor: pointer; border: 1px solid #2a2a2e;
    background: #111113; color: #71717a; transition: all 0.15s;
  }
  .pill.active { background: #1a1a2e; border-color: #60a5fa; color: #60a5fa; }
  .pill:hover { border-color: #60a5fa; }

  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left; font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.05em; color: #71717a; padding: 8px 10px;
    border-bottom: 1px solid #2a2a2e; position: sticky; top: 0;
    background: #0a0a0b; font-weight: 500;
  }
  td { padding: 6px 10px; border-bottom: 1px solid #1f1f23; }
  tr:hover td { background: #111113; }
  tr.downloaded td { opacity: 0.5; }
  tr.downloaded td:first-child { opacity: 1; }

  .status-badge {
    display: inline-block; padding: 2px 8px; border-radius: 10px;
    font-size: 10px; font-weight: 600;
  }
  .status-badge.done { background: #052e16; color: #4ade80; }
  .status-badge.pending { background: #1c1917; color: #fbbf24; }
  .status-badge.skipped { background: #1e1b4b; color: #818cf8; }

  .game-type { font-size: 10px; font-weight: 600; }
  .game-type.nlh { color: #60a5fa; }
  .game-type.plo { color: #c084fc; }
  .game-type.mixed { color: #fbbf24; }

  a { color: #60a5fa; text-decoration: none; }
  a:hover { text-decoration: underline; }

  .context { color: #52525b; font-size: 11px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .action-btn {
    background: none; border: 1px solid #2a2a2e; border-radius: 4px;
    color: #71717a; padding: 2px 8px; font-size: 10px; cursor: pointer;
    font-family: inherit; transition: all 0.15s;
  }
  .action-btn:hover { border-color: #60a5fa; color: #60a5fa; }
  .action-btn.mark-done { border-color: #166534; color: #4ade80; }
  .action-btn.mark-done:hover { background: #052e16; }

  .bulk-bar {
    display: flex; gap: 10px; align-items: center;
    background: #111113; border: 1px solid #2a2a2e; border-radius: 8px;
    padding: 8px 16px; margin-bottom: 16px;
  }
  .bulk-bar button {
    background: #1a1a2e; border: 1px solid #2a2a2e; border-radius: 4px;
    color: #60a5fa; padding: 4px 12px; font-size: 11px; cursor: pointer;
    font-family: inherit;
  }
  .bulk-bar button:hover { background: #222236; }
</style>
</head>
<body>
<h1>PokerNow Link Tracker</h1>
<p class="subtitle">Cornell Poker Club - Ongoing Games channel</p>

<div class="stats" id="stats"></div>

<div class="filters">
  <label>Status:</label>
  <span class="pill active" data-filter="all" onclick="setStatusFilter('all')">All</span>
  <span class="pill" data-filter="pending" onclick="setStatusFilter('pending')">Pending</span>
  <span class="pill" data-filter="done" onclick="setStatusFilter('done')">Downloaded</span>
  <span class="pill" data-filter="skipped" onclick="setStatusFilter('skipped')">Skipped</span>
  <span style="width:20px"></span>
  <label>Type:</label>
  <span class="pill active" data-type="all" onclick="setTypeFilter('all')">All</span>
  <span class="pill" data-type="NLH" onclick="setTypeFilter('NLH')">NLH</span>
  <span class="pill" data-type="PLO" onclick="setTypeFilter('PLO')">PLO</span>
  <span style="width:20px"></span>
  <label>Search:</label>
  <input type="text" id="searchInput" placeholder="player, stakes, id..." oninput="render()">
</div>

<div class="bulk-bar">
  <span style="font-size:11px;color:#71717a;">Bulk:</span>
  <button onclick="openAllPending()">Open next 5 pending links</button>
  <button onclick="exportStatus()">Export tracking data</button>
  <button onclick="importStatus()">Import tracking data</button>
  <button onclick="rescrape()">Re-scrape Discord (instructions)</button>
</div>

<table>
  <thead>
    <tr>
      <th>Status</th>
      <th>#</th>
      <th>Date</th>
      <th>Host</th>
      <th>Stakes</th>
      <th>Type</th>
      <th>Game Link</th>
      <th>Context</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody id="tbody"></tbody>
</table>

<script>
const GAMES = ${gamesJson};
const INITIAL_DOWNLOADED = new Set(${downloadedJson});

// Status: 'pending' | 'done' | 'skipped'
const STORAGE_KEY = 'pokernow-link-tracker';

function loadStatus() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveStatus(status) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
}

let status = loadStatus();

// Initialize already-downloaded files as 'done'
for (const id of INITIAL_DOWNLOADED) {
  if (!status[id]) status[id] = 'done';
}
saveStatus(status);

function getStatus(gameId) {
  return status[gameId] || 'pending';
}

function setStatus(gameId, newStatus) {
  status[gameId] = newStatus;
  saveStatus(status);
  render();
}

// Filters
let statusFilter = 'all';
let typeFilter = 'all';

function setStatusFilter(f) {
  statusFilter = f;
  document.querySelectorAll('[data-filter]').forEach(el => {
    el.classList.toggle('active', el.dataset.filter === f);
  });
  render();
}

function setTypeFilter(f) {
  typeFilter = f;
  document.querySelectorAll('[data-type]').forEach(el => {
    el.classList.toggle('active', el.dataset.type === f);
  });
  render();
}

function getFilteredGames() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  return GAMES.filter(g => {
    const s = getStatus(g.gameId);
    if (statusFilter !== 'all' && s !== statusFilter) return false;
    if (typeFilter !== 'all' && g.gameType !== typeFilter) return false;
    if (search) {
      const haystack = (g.postedBy + ' ' + g.stakes + ' ' + g.gameId + ' ' + g.context + ' ' + g.date).toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

function render() {
  const filtered = getFilteredGames();

  // Stats
  const total = GAMES.length;
  const done = GAMES.filter(g => getStatus(g.gameId) === 'done').length;
  const pending = GAMES.filter(g => getStatus(g.gameId) === 'pending').length;
  const skipped = GAMES.filter(g => getStatus(g.gameId) === 'skipped').length;

  document.getElementById('stats').innerHTML = \`
    <div class="stat-item"><div class="stat-value blue">\${total}</div><div class="stat-label">Total Games</div></div>
    <div class="stat-item"><div class="stat-value green">\${done}</div><div class="stat-label">Downloaded</div></div>
    <div class="stat-item"><div class="stat-value amber">\${pending}</div><div class="stat-label">Pending</div></div>
    <div class="stat-item"><div class="stat-value">\${skipped}</div><div class="stat-label">Skipped</div></div>
    <div class="stat-item"><div class="stat-value blue">\${filtered.length}</div><div class="stat-label">Showing</div></div>
  \`;

  // Table - newest first
  const reversed = [...filtered].reverse();
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = reversed.map((g, i) => {
    const s = getStatus(g.gameId);
    const badgeClass = s === 'done' ? 'done' : s === 'skipped' ? 'skipped' : 'pending';
    const badgeLabel = s === 'done' ? 'Done' : s === 'skipped' ? 'Skip' : 'Pending';
    const rowClass = s === 'done' ? 'downloaded' : '';
    const typeClass = g.gameType.toLowerCase();

    return \`<tr class="\${rowClass}">
      <td><span class="status-badge \${badgeClass}">\${badgeLabel}</span></td>
      <td style="color:#52525b">\${filtered.length - i}</td>
      <td>\${g.date}<br><span style="color:#52525b;font-size:10px">\${g.time}</span></td>
      <td>\${g.postedBy}</td>
      <td>\${g.stakes || '<span style="color:#52525b">-</span>'}</td>
      <td><span class="game-type \${typeClass}">\${g.gameType}</span></td>
      <td><a href="\${g.url}" target="_blank" title="Open in PokerNow" onclick="setStatus('\${g.gameId}','done')">\${g.gameId.substring(0, 20)}...</a></td>
      <td><span class="context" title="\${g.context.replace(/"/g, '&quot;')}">\${g.context || '-'}</span></td>
      <td style="white-space:nowrap">
        \${s !== 'done' ? \`<button class="action-btn mark-done" onclick="setStatus('\${g.gameId}','done')">Done</button>\` : ''}
        \${s !== 'skipped' ? \`<button class="action-btn" onclick="setStatus('\${g.gameId}','skipped')">Skip</button>\` : ''}
        \${s !== 'pending' ? \`<button class="action-btn" onclick="setStatus('\${g.gameId}','pending')">Reset</button>\` : ''}
      </td>
    </tr>\`;
  }).join('');
}

function openAllPending() {
  const pending = GAMES.filter(g => getStatus(g.gameId) === 'pending').reverse().slice(0, 5);
  if (pending.length === 0) { alert('No pending games!'); return; }
  for (const g of pending) {
    window.open(g.url, '_blank');
  }
}

function exportStatus() {
  const blob = new Blob([JSON.stringify(status, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pokernow-tracker-status.json';
  a.click();
}

function importStatus() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        Object.assign(status, imported);
        saveStatus(status);
        render();
        alert('Imported ' + Object.keys(imported).length + ' status entries');
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function rescrape() {
  alert('Run this command to refresh Discord data:\\n\\ncd "D:/Projects/Poker/2026/Preflop Analysis"\\ndiscord-scrape channel export 1402493177692422295 --range all -o ongoing-games.json\\nnode build-tracker.mjs');
}

// Initial render
render();
</script>
</body>
</html>`;

writeFileSync('link-tracker.html', html);
console.log(`\nGenerated link-tracker.html with ${games.length} game links`);
console.log(`Already downloaded: ${downloadedIds.size} files (auto-marked as Done)`);
