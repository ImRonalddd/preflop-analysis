import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

// Path to the Pokernow Logs folder (relative to project root's parent)
const LOGS_DIR = join(process.cwd(), '..', 'Pokernow Logs');

export async function GET() {
  try {
    const files = await readdir(LOGS_DIR);
    const csvFiles = files.filter(f => f.startsWith('poker_now_log_') && f.endsWith('.csv')).sort();

    const results = await Promise.all(
      csvFiles.map(async (filename) => {
        const content = await readFile(join(LOGS_DIR, filename), 'utf-8');
        return { filename, content };
      })
    );

    return NextResponse.json({ files: results });
  } catch (err) {
    return NextResponse.json({ files: [], error: String(err) }, { status: 200 });
  }
}
