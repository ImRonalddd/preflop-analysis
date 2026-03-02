"use client";

import { useState, useMemo } from 'react';
import type { PlayerAlias } from '@/types';

interface AliasManagerProps {
  aliases: PlayerAlias[];
  onChange: (aliases: PlayerAlias[]) => void;
  playerIdMap: Record<string, string[]>;
}

export default function AliasManager({ aliases, onChange, playerIdMap }: AliasManagerProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editPrimary, setEditPrimary] = useState('');
  const [editAliases, setEditAliases] = useState('');

  // Auto-detect potential aliases from player IDs
  const suggestions = useMemo(() => {
    const result: { id: string; names: string[] }[] = [];
    for (const [id, names] of Object.entries(playerIdMap)) {
      if (names.length > 1) {
        // Check if already aliased
        const hasAlias = aliases.some(a =>
          names.some(n => n === a.primaryName || a.aliases.includes(n))
        );
        if (!hasAlias) {
          result.push({ id, names });
        }
      }
    }
    return result;
  }, [playerIdMap, aliases]);

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditPrimary(aliases[idx].primaryName);
    setEditAliases(aliases[idx].aliases.join(', '));
  };

  const saveEdit = () => {
    if (editingIdx === null) return;
    const updated = [...aliases];
    updated[editingIdx] = {
      primaryName: editPrimary.trim(),
      aliases: editAliases.split(',').map(s => s.trim()).filter(Boolean),
    };
    onChange(updated);
    setEditingIdx(null);
  };

  const addAlias = (primary: string, aliasList: string[]) => {
    onChange([...aliases, { primaryName: primary, aliases: aliasList }]);
  };

  const removeAlias = (idx: number) => {
    onChange(aliases.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-mono font-medium text-[var(--text-primary)] mb-2">
          Player Aliases
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Merge different screen names used by the same player across sessions.
        </p>
      </div>

      {/* Existing aliases */}
      {aliases.length > 0 && (
        <div className="space-y-2">
          {aliases.map((alias, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded px-3 py-2">
              {editingIdx === idx ? (
                <>
                  <input
                    value={editPrimary}
                    onChange={(e) => setEditPrimary(e.target.value)}
                    className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-2 py-1 text-xs font-mono text-[var(--text-primary)] w-32"
                    placeholder="Primary name"
                  />
                  <span className="text-xs text-[var(--text-tertiary)]">=</span>
                  <input
                    value={editAliases}
                    onChange={(e) => setEditAliases(e.target.value)}
                    className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-2 py-1 text-xs font-mono text-[var(--text-primary)] flex-1"
                    placeholder="alias1, alias2"
                  />
                  <button onClick={saveEdit} className="text-xs text-[var(--accent-green)] hover:underline">Save</button>
                  <button onClick={() => setEditingIdx(null)} className="text-xs text-[var(--text-secondary)] hover:underline">Cancel</button>
                </>
              ) : (
                <>
                  <span className="text-sm font-mono text-[var(--accent-blue)]">{alias.primaryName}</span>
                  <span className="text-xs text-[var(--text-tertiary)]">=</span>
                  <span className="text-xs font-mono text-[var(--text-secondary)] flex-1">
                    {alias.aliases.join(', ')}
                  </span>
                  <button onClick={() => startEdit(idx)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Edit</button>
                  <button onClick={() => removeAlias(idx)} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent-red)]">&times;</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Auto-detected suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-mono text-[var(--accent-amber)] uppercase tracking-wider">
            Detected (same player ID, different names)
          </h4>
          {suggestions.map(({ id, names }) => (
            <div key={id} className="flex items-center gap-3 bg-[var(--bg-surface)] border border-dashed border-[var(--border)] rounded px-3 py-2">
              <span className="text-xs font-mono text-[var(--text-secondary)] flex-1">
                {names.join(' / ')}
              </span>
              <button
                onClick={() => addAlias(names[0], names.slice(1))}
                className="text-xs text-[var(--accent-green)] hover:underline"
              >
                Merge
              </button>
            </div>
          ))}
        </div>
      )}

      {aliases.length === 0 && suggestions.length === 0 && (
        <p className="text-xs text-[var(--text-tertiary)] font-mono">
          No aliases configured. Upload session files to auto-detect players.
        </p>
      )}
    </div>
  );
}
