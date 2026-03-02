"use client";

import type { SessionData } from '@/types';

interface SessionManagerProps {
  sessions: SessionData[];
  onDelete: (sessionId: string) => void;
  totalNlhHands: number;
  totalPloSkipped: number;
}

export default function SessionManager({
  sessions,
  onDelete,
  totalNlhHands,
  totalPloSkipped,
}: SessionManagerProps) {
  if (sessions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between px-1">
        <h3 style={{ color: "var(--text-secondary)" }} className="text-xs font-medium uppercase tracking-wider">
          Sessions
        </h3>
        <div style={{ color: "var(--text-secondary)" }} className="flex gap-4 text-xs font-mono">
          <span>
            <span style={{ color: "var(--accent-blue)" }}>{sessions.length}</span>{" "}
            {sessions.length === 1 ? "session" : "sessions"}
          </span>
          <span>
            <span style={{ color: "var(--accent-green)" }}>{totalNlhHands}</span> NLH hands
          </span>
          {totalPloSkipped > 0 && (
            <span>
              <span style={{ color: "var(--text-tertiary)" }}>{totalPloSkipped}</span> PLO skipped
            </span>
          )}
        </div>
      </div>

      <div style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-surface)" }} className="rounded-md border">
        {sessions.map((session, i) => (
          <div
            key={session.id}
            style={{ borderBottomColor: i < sessions.length - 1 ? "var(--border)" : "transparent" }}
            className="flex items-center justify-between border-b px-4 py-2.5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span style={{ color: "var(--accent-green)" }} className="flex-shrink-0 text-xs font-medium">
                CSV
              </span>
              <span style={{ color: "var(--text-primary)" }} className="truncate text-sm font-mono">
                {session.filename}
              </span>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <div style={{ color: "var(--text-secondary)" }} className="flex gap-4 text-xs font-mono">
                <span>{session.nlhHandCount} hands</span>
                <span>{session.stakeLevels.join(", ")}</span>
                <span>{session.playerNames.length} players</span>
              </div>
              <button
                onClick={() => onDelete(session.id)}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent-red)] transition-colors px-2 py-1"
                title="Remove session"
              >
                &times;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
