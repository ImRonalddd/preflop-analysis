"use client";

import { useMemo, useState } from 'react';
import type { PreflopDecision, PreflopAction, MatrixCell } from '@/types';
import { RANKS, ACTION_COLORS, ACTION_LABELS } from '@/types';
import { populateMatrix } from '@/lib/matrixBuilder';
import CellDetailPanel from './CellDetailPanel';

interface HandMatrixProps {
  decisions: PreflopDecision[];
}

const ACTION_ORDER: PreflopAction[] = [
  'open_raise', '3bet', '4bet', '5bet_plus', 'all_in', 'call_open', 'call_3bet', 'call_4bet_plus', 'limp', 'fold',
];

function MatrixCellComponent({ cell, onClick }: { cell: MatrixCell; onClick: () => void }) {
  const { row, col } = useMemo(() => {
    const r1Idx = RANKS.indexOf(cell.combo.rank1);
    const r2Idx = RANKS.indexOf(cell.combo.rank2);
    if (cell.combo.rank1 === cell.combo.rank2) return { row: r1Idx, col: r1Idx };
    const high = Math.min(r1Idx, r2Idx);
    const low = Math.max(r1Idx, r2Idx);
    return cell.combo.suited ? { row: high, col: low } : { row: low, col: high };
  }, [cell.combo]);

  const isPair = row === col;
  const isSuited = row < col;

  // Build proportional action bars
  const bars = useMemo(() => {
    if (cell.totalObservations === 0) return [];
    return ACTION_ORDER
      .filter(a => cell.actions[a] > 0)
      .map(a => ({
        action: a,
        count: cell.actions[a],
        pct: (cell.actions[a] / cell.totalObservations) * 100,
        color: ACTION_COLORS[a],
      }));
  }, [cell]);

  const bgClass = isPair
    ? 'bg-[#1a1a2e]'
    : isSuited
      ? 'bg-[#1a2a1a]'
      : 'bg-[var(--bg-surface)]';

  return (
    <button
      onClick={onClick}
      className={`relative w-full aspect-square ${bgClass} border border-[var(--border-subtle)] rounded-sm overflow-hidden hover:border-[var(--accent-blue)] transition-colors group`}
      title={`${cell.label} (n=${cell.totalObservations})`}
    >
      {/* Proportional color bars */}
      {bars.length > 0 && (
        <div className="absolute inset-0 flex flex-row">
          {bars.map(b => (
            <div
              key={b.action}
              style={{
                backgroundColor: b.color,
                flexGrow: b.pct,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      )}

      {/* Label overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <span className="text-[10px] font-mono font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-none">
          {cell.label}
        </span>
        {cell.totalObservations > 0 && (
          <span className="text-[8px] font-mono text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-none mt-0.5">
            {cell.totalObservations}
          </span>
        )}
      </div>
    </button>
  );
}

function MatrixLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs font-mono">
      {ACTION_ORDER.map(action => (
        <div key={action} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: ACTION_COLORS[action], opacity: 0.7 }}
          />
          <span className="text-[var(--text-secondary)]">{ACTION_LABELS[action]}</span>
        </div>
      ))}
    </div>
  );
}

export default function HandMatrix({ decisions }: HandMatrixProps) {
  const matrix = useMemo(() => populateMatrix(decisions), [decisions]);
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null);

  const totalShowdowns = decisions.length;
  const cellsWithData = useMemo(
    () => matrix.flat().filter(c => c.totalObservations > 0).length,
    [matrix],
  );

  const rankLabels = RANKS.map(r => r === '10' ? 'T' : r);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-mono font-medium text-[var(--text-primary)]">
          Hand Matrix
          <span className="text-[var(--text-tertiary)] ml-2">
            (showdown hands only)
          </span>
        </h2>
        <span className="text-xs font-mono text-[var(--text-secondary)]">
          {totalShowdowns} observations | {cellsWithData}/169 combos
        </span>
      </div>

      <MatrixLegend />

      <div className="flex gap-6">
        {/* Matrix grid */}
        <div className="flex-1 max-w-[700px]">
          <div className="grid gap-[1px]" style={{ gridTemplateColumns: `auto repeat(13, 1fr)` }}>
            {/* Corner */}
            <div />
            {/* Column headers */}
            {rankLabels.map(r => (
              <div key={`col-${r}`} className="text-center text-[10px] font-mono text-[var(--text-secondary)] py-1">
                {r}
              </div>
            ))}

            {/* Rows */}
            {matrix.map((row, ri) => (
              <>
                {/* Row header */}
                <div key={`row-label-${ri}`} className="flex items-center justify-center text-[10px] font-mono text-[var(--text-secondary)] pr-1">
                  {rankLabels[ri]}
                </div>
                {/* Cells */}
                {row.map((cell, ci) => (
                  <MatrixCellComponent
                    key={`${ri}-${ci}`}
                    cell={cell}
                    onClick={() => setSelectedCell(cell)}
                  />
                ))}
              </>
            ))}
          </div>

          <div className="mt-2 flex gap-6 text-[10px] font-mono text-[var(--text-tertiary)]">
            <span><span className="inline-block w-2 h-2 rounded-sm bg-[#1a2a1a] border border-[var(--border-subtle)] mr-1" />Suited</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-[#1a1a2e] border border-[var(--border-subtle)] mr-1" />Pairs</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] mr-1" />Offsuit</span>
          </div>
        </div>

        {/* Detail panel */}
        {selectedCell && selectedCell.totalObservations > 0 && (
          <CellDetailPanel
            cell={selectedCell}
            onClose={() => setSelectedCell(null)}
          />
        )}
      </div>
    </div>
  );
}
