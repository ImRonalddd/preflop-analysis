"use client";

import { useAppState } from '@/hooks/useAppState';
import FileUpload from './FileUpload';
import SessionManager from './SessionManager';
import FilterBar from './FilterBar';
import AliasManager from './AliasManager';
import StatsPanel from './StatsPanel';
import HandMatrix from './HandMatrix';
import dynamic from 'next/dynamic';

const ActionDistributionChart = dynamic(() => import('./charts/ActionDistributionChart'), { ssr: false });
const PositionStatsChart = dynamic(() => import('./charts/PositionStatsChart'), { ssr: false });
const RaiseSizeChart = dynamic(() => import('./charts/RaiseSizeChart'), { ssr: false });

export function AppShell() {
  const state = useAppState();

  const showdownCount = state.filteredDecisions.filter(d => d.cards !== null).length;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-mono font-semibold tracking-tight">
              NLH Preflop Analyzer
            </h1>
            <p className="text-xs text-[var(--text-secondary)] font-mono">
              No Limit Hold&apos;em preflop analysis
            </p>
          </div>
          <nav className="flex gap-1 bg-[var(--bg-surface)] rounded-md p-1 border border-[var(--border)]">
            {(['upload', 'analysis', 'matrix', 'settings'] as const).map((view) => (
              <button
                key={view}
                onClick={() => state.setActiveView(view)}
                className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                  state.activeView === view
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Upload View */}
        {state.activeView === 'upload' && (
          <div className="space-y-6">
            <FileUpload onUpload={state.handleFileUpload} />
            <SessionManager
              sessions={state.sessions}
              onDelete={state.deleteSession}
              totalNlhHands={state.totalNlhHands}
              totalPloSkipped={state.totalPloSkipped}
            />
          </div>
        )}

        {/* Analysis View */}
        {state.activeView === 'analysis' && (
          state.sessions.length === 0 ? (
            <EmptyState onNavigate={() => state.setActiveView('upload')} />
          ) : (
            <div className="space-y-6">
              <FilterBar
                players={state.allPlayers}
                selectedPlayer={state.selectedPlayer}
                onPlayerChange={state.setSelectedPlayer}
                stakeLevels={state.allStakeLevels}
                selectedStake={state.selectedStake}
                onStakeChange={state.setSelectedStake}
                positions={state.allPositions}
                selectedPosition={state.selectedPosition}
                onPositionChange={state.setSelectedPosition}
                totalHands={state.totalNlhHands}
                filteredCount={state.filteredDecisions.length}
                showdownCount={showdownCount}
              />
              {state.filteredPlayerStats && (
                <StatsPanel stats={state.filteredPlayerStats} />
              )}

              {/* Charts */}
              {state.filteredDecisions.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4">
                    <h3 className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                      Action Distribution
                    </h3>
                    <ActionDistributionChart decisions={state.filteredDecisions} />
                  </div>
                  <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4">
                    <h3 className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                      Stats by Position
                    </h3>
                    <PositionStatsChart decisions={state.filteredDecisions} />
                  </div>
                  <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4 lg:col-span-2">
                    <h3 className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                      Raise Sizing Distribution (BB)
                    </h3>
                    <RaiseSizeChart decisions={state.filteredDecisions} />
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* Matrix View */}
        {state.activeView === 'matrix' && (
          state.sessions.length === 0 ? (
            <EmptyState onNavigate={() => state.setActiveView('upload')} />
          ) : (
            <div className="space-y-6">
              <FilterBar
                players={state.allPlayers}
                selectedPlayer={state.selectedPlayer}
                onPlayerChange={state.setSelectedPlayer}
                stakeLevels={state.allStakeLevels}
                selectedStake={state.selectedStake}
                onStakeChange={state.setSelectedStake}
                positions={state.allPositions}
                selectedPosition={state.selectedPosition}
                onPositionChange={state.setSelectedPosition}
                totalHands={state.totalNlhHands}
                filteredCount={state.filteredDecisions.length}
                showdownCount={showdownCount}
              />
              <HandMatrix decisions={state.filteredDecisions.filter(d => d.cards !== null)} />
            </div>
          )
        )}

        {/* Settings View */}
        {state.activeView === 'settings' && (
          <AliasManager
            aliases={state.config.aliasConfig.players}
            onChange={state.updateAliases}
            playerIdMap={state.playerIdMap}
          />
        )}
      </div>
    </div>
  );
}

function EmptyState({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="text-center py-20">
      <p className="text-[var(--text-secondary)] font-mono text-sm">
        No data loaded. Upload a PokerNow CSV to begin.
      </p>
      <button
        onClick={onNavigate}
        className="mt-4 px-4 py-2 text-xs font-mono border border-[var(--border)] rounded hover:bg-[var(--bg-surface)] transition-colors"
      >
        Go to Upload
      </button>
    </div>
  );
}
