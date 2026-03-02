"use client";

import type { Position } from '@/types';

interface FilterBarProps {
  players: string[];
  selectedPlayer: string | null;
  onPlayerChange: (player: string | null) => void;
  stakeLevels: string[];
  selectedStake: string | null;
  onStakeChange: (stake: string | null) => void;
  positions: Position[];
  selectedPosition: string | null;
  onPositionChange: (position: string | null) => void;
  totalHands: number;
  filteredCount: number;
  showdownCount: number;
}

export default function FilterBar({
  players,
  selectedPlayer,
  onPlayerChange,
  stakeLevels,
  selectedStake,
  onStakeChange,
  positions,
  selectedPosition,
  onPositionChange,
  totalHands,
  filteredCount,
  showdownCount,
}: FilterBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Player select */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-[var(--text-secondary)]">Player</label>
          <select
            value={selectedPlayer ?? ''}
            onChange={(e) => onPlayerChange(e.target.value || null)}
            className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-3 py-1.5 text-sm font-mono text-[var(--text-primary)] focus:border-[var(--accent-blue)] outline-none"
          >
            <option value="">All players</option>
            {players.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Stake pills */}
        {stakeLevels.length > 1 && (
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-mono text-[var(--text-secondary)]">Stakes</label>
            <button
              onClick={() => onStakeChange(null)}
              className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                selectedStake === null
                  ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--bg-elevated)]'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All
            </button>
            {stakeLevels.map(s => (
              <button
                key={s}
                onClick={() => onStakeChange(selectedStake === s ? null : s)}
                className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                  selectedStake === s
                    ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--bg-elevated)]'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Position pills */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-mono text-[var(--text-secondary)]">Position</label>
          <button
            onClick={() => onPositionChange(null)}
            className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
              selectedPosition === null
                ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--bg-elevated)]'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            All
          </button>
          {positions.map(pos => (
            <button
              key={pos}
              onClick={() => onPositionChange(selectedPosition === pos ? null : pos)}
              className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                selectedPosition === pos
                  ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--bg-elevated)]'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Summary counts */}
      <div className="flex gap-4 text-xs font-mono text-[var(--text-secondary)]">
        <span>
          <span style={{ color: "var(--accent-green)" }}>{totalHands}</span> total hands
        </span>
        <span>
          <span style={{ color: "var(--accent-blue)" }}>{filteredCount}</span> filtered decisions
        </span>
        <span>
          <span style={{ color: "var(--accent-purple)" }}>{showdownCount}</span> showdowns
        </span>
      </div>
    </div>
  );
}
