"use client";

import type { PlayerPreflopStats } from '@/types';

interface StatsPanelProps {
  stats: PlayerPreflopStats;
}

function StatCell({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4 space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
        <span className="text-xs font-mono text-[var(--text-tertiary)]">n={value}</span>
      </div>
      <div className="text-2xl font-mono font-semibold" style={{ color }}>
        {pct.toFixed(1)}%
      </div>
      {/* Frequency bar */}
      <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-mono font-medium text-[var(--text-primary)]">
          Preflop Stats: <span className="text-[var(--accent-blue)]">{stats.playerName}</span>
        </h2>
        <span className="text-xs font-mono text-[var(--text-secondary)]">
          {stats.totalHands} hands | {stats.showdownHands} showdowns
        </span>
      </div>

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCell label="VPIP" value={stats.vpipHands} pct={stats.vpipPct} color="var(--accent-green)" />
        <StatCell label="PFR" value={stats.pfrHands} pct={stats.pfrPct} color="var(--accent-red)" />
        <StatCell label="3-Bet" value={stats.threeBetHands} pct={stats.threeBetPct} color="var(--accent-purple)" />
        <StatCell label="Limp" value={stats.limpHands} pct={stats.limpPct} color="var(--accent-amber)" />
        <StatCell
          label="Fold to 3B"
          value={stats.foldToThreeBetHands}
          pct={stats.foldToThreeBetPct}
          color="var(--text-secondary)"
        />
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider">Avg Raise</span>
            <span className="text-xs font-mono text-[var(--text-tertiary)]">BB</span>
          </div>
          <div className="text-2xl font-mono font-semibold text-[var(--accent-cyan)]">
            {stats.avgRaiseBB > 0 ? stats.avgRaiseBB.toFixed(1) : '-'}
          </div>
          <div className="h-1.5" /> {/* spacer to align with other cells */}
        </div>
      </div>
    </div>
  );
}
