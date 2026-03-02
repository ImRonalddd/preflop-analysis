import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('ongoing-games.json', 'utf-8'));
const linkRegex = /https?:\/\/(?:www\.)?pokernow\.(?:club|com)\/games\/([A-Za-z0-9_-]+)/g;

const links = new Map();
for (const msg of data.messages) {
  let match;
  while ((match = linkRegex.exec(msg.content)) !== null) {
    const gameId = match[1];
    if (!links.has(gameId)) {
      links.set(gameId, {
        gameId,
        url: match[0],
        firstPosted: msg.created_at,
        postedBy: msg.author.display_name || msg.author.username,
        messageSnippet: msg.content.substring(0, 120).replace(/\n/g, ' '),
      });
    }
  }
}

console.log('Total unique PokerNow game links:', links.size);
console.log('');

const arr = Array.from(links.values());
for (const l of arr.slice(0, 5)) {
  console.log(l.firstPosted.substring(0,10), '|', l.postedBy.padEnd(15), '|', l.gameId);
  console.log('  ', l.messageSnippet.substring(0, 100));
}
console.log('...');
for (const l of arr.slice(-5)) {
  console.log(l.firstPosted.substring(0,10), '|', l.postedBy.padEnd(15), '|', l.gameId);
  console.log('  ', l.messageSnippet.substring(0, 100));
}
