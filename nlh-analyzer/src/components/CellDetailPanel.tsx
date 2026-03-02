"use client";

import type { MatrixCell, PreflopAction } from '@/types';
import { ACTION_COLORS, ACTION_LABELS } from '@/types';

interface CellDetailPanelProps {
  cell: MatrixCell;
  onClose: () => void;
}

const ACTION_ORDER: PreflopAction[] = [
  'open_raise', '3bet', '4bet', '5bet_plus', 'all_in', 'call_open', 'call_3bet', 'call_4bet_plus', 'limp', 'fold',
];

function formatCards(cards: { rank: string; suit: string }[]): string {
  const suitSymbol: Record<string, string> = { h: '\u2665', d: '\u2666', c: '\u2663', s: '\u2660' };
  return cards.map(c => `${c.rank === '10' ? 'T' : c.rank}${suitSymbol[c.suit] ?? c.suit}`).join('');
}

export default function CellDetailPanel({ cell, onClose }: CellDetailPanelProps) {
  const activeActions = ACTION_ORDER.filter(a => cell.actions[a] > 0);

  return (
    <div className="w-72 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4 space-y-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-mono font-semibold text-[var(--text-primary)]">
          {cell.label}
        </h3>
        <button
          onClick={onClose}
          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm"
        >
          &times;
        </button>
      </div>

      <div className="text-xs font-mono text-[var(--text-secondary)]">
        {cell.totalObservations} observation{cell.totalObservations !== 1 ? 's' : ''}
      </div>

      {/* Action breakdown table */}
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left text-[10px]">Action</th>
            <th className="text-right text-[10px]">Count</th>
            <th className="text-right text-[10px]">%</th>
          </tr>
        </thead>
        <tbody>
          {activeActions.map(action => {
            const count = cell.actions[action];
            const pct = (count / cell.totalObservations) * 100;
            return (
              <tr key={action}>
                <td className="py-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: ACTION_COLORS[action] }}
                    />
                    <span className="text-xs font-mono">{ACTION_LABELS[action]}</span>
                  </div>
                </td>
                <td className="text-right text-xs font-mono">{count}</td>
                <td className="text-right text-xs font-mono text-[var(--text-secondary)]">
                  {pct.toFixed(0)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Individual hands list */}
      {cell.decisions.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
            Hands
          </h4>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {cell.decisions.map((d, i) => (
              <div
                key={`${d.handId}-${i}`}
                className="flex items-center justify-between text-[11px] font-mono bg-[var(--bg-elevated)] rounded px-2 py-1"
              >
                <span className="text-[var(--text-secondary)]">
                  #{d.handNumber}
                </span>
                <span className="text-[var(--text-tertiary)]">{d.position}</span>
                <span style={{ color: ACTION_COLORS[d.action] }}>
                  {ACTION_LABELS[d.action]}
                </span>
                {d.cards && (
                  <span className="text-[var(--text-primary)]">
                    {formatCards(d.cards)}
                  </span>
                )}
                {d.raiseBB > 0 && (
                  <span className="text-[var(--accent-cyan)]">
                    {d.raiseBB.toFixed(1)}bb
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
