"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  ParsedHand, PreflopDecision, SessionData, AppConfig,
  PlayerPreflopStats, PlayerAlias, Position,
} from '@/types';
import { parseFullLog } from '@/lib/parser';
import { analyzeAllHands, filterDecisions } from '@/lib/analyzer';
import type { AnalysisResult } from '@/lib/analyzer';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

type ActiveView = 'upload' | 'analysis' | 'matrix' | 'settings';

const DEFAULT_CONFIG: AppConfig = {
  aliasConfig: { players: [], lastUpdated: new Date().toISOString() },
};

const LOCAL_STORAGE_KEY = 'nlh-analyzer-config';

function loadConfig(): AppConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppConfig;
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

function saveConfig(config: AppConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// The hook
// ---------------------------------------------------------------------------

export function useAppState() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // Filters
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedStake, setSelectedStake] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  // UI
  const [activeView, setActiveView] = useState<ActiveView>('upload');

  // Track auto-load state
  const [autoLoaded, setAutoLoaded] = useState(false);

  // Load config on mount
  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  // Persist config
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  // ---------- Auto-load CSVs from Pokernow Logs folder ----------

  useEffect(() => {
    if (autoLoaded) return;
    setAutoLoaded(true);

    async function autoLoad() {
      try {
        const resp = await fetch('/api/logs');
        if (!resp.ok) return;
        const data = await resp.json();
        if (!data.files || data.files.length === 0) return;

        const newSessions: SessionData[] = [];
        for (const file of data.files as { filename: string; content: string }[]) {
          const sessionId = `auto-${file.filename.replace(/[^a-zA-Z0-9]/g, '-')}`;
          const parseResult = parseFullLog(file.content, sessionId);

          newSessions.push({
            id: sessionId,
            filename: file.filename,
            uploadedAt: new Date().toISOString(),
            hands: parseResult.hands,
            nlhHandCount: parseResult.nlhCount,
            ploSkippedCount: parseResult.ploSkipped,
            stakeLevels: parseResult.stakeLevels,
            playerNames: parseResult.playerNames,
          });
        }

        if (newSessions.length > 0) {
          setSessions(newSessions);
          const currentConfig = loadConfig();
          const allHands = newSessions.flatMap(s => s.hands);
          if (allHands.length > 0) {
            setAnalysis(analyzeAllHands(allHands, currentConfig.aliasConfig.players));
          }
          setActiveView('analysis');
        }
      } catch {
        // API not available (static export, etc.) - skip auto-load
      }
    }

    autoLoad();
  }, [autoLoaded]);

  // ---------- All hands across sessions ----------

  const allHands = useMemo((): ParsedHand[] => {
    return sessions.flatMap(s => s.hands);
  }, [sessions]);

  // ---------- Re-run analysis when sessions or aliases change ----------

  const reanalyze = useCallback((currentSessions: SessionData[], aliases: PlayerAlias[]) => {
    const hands = currentSessions.flatMap(s => s.hands);
    if (hands.length === 0) {
      setAnalysis(null);
      return;
    }
    const result = analyzeAllHands(hands, aliases);
    setAnalysis(result);
  }, []);

  // ---------- File upload ----------

  const handleFileUpload = useCallback(
    (filename: string, content: string) => {
      setSessions(prev => {
        // Skip if this file is already loaded
        if (prev.some(s => s.filename === filename)) return prev;

        const sessionId = `s${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const parseResult = parseFullLog(content, sessionId);

        const session: SessionData = {
          id: sessionId,
          filename,
          uploadedAt: new Date().toISOString(),
          hands: parseResult.hands,
          nlhHandCount: parseResult.nlhCount,
          ploSkippedCount: parseResult.ploSkipped,
          stakeLevels: parseResult.stakeLevels,
          playerNames: parseResult.playerNames,
        };

        const next = [...prev, session];
        reanalyze(next, config.aliasConfig.players);
        return next;
      });

      setActiveView('analysis');
    },
    [config.aliasConfig.players, reanalyze],
  );

  // ---------- Delete session ----------

  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions(prev => {
        const next = prev.filter(s => s.id !== sessionId);
        reanalyze(next, config.aliasConfig.players);
        return next;
      });
    },
    [config.aliasConfig.players, reanalyze],
  );

  // ---------- Alias updates ----------

  const updateAliases = useCallback(
    (players: PlayerAlias[]) => {
      setConfig(prev => ({
        ...prev,
        aliasConfig: {
          players,
          lastUpdated: new Date().toISOString(),
        },
      }));
      reanalyze(sessions, players);
    },
    [sessions, reanalyze],
  );

  // ---------- Computed: player ID map ----------

  const playerIdMap = useMemo((): Record<string, string[]> => {
    const idToNames: Record<string, Set<string>> = {};
    for (const session of sessions) {
      for (const hand of session.hands) {
        for (const player of hand.players) {
          if (player.id) {
            if (!idToNames[player.id]) idToNames[player.id] = new Set();
            idToNames[player.id].add(player.name);
          }
        }
      }
    }
    const result: Record<string, string[]> = {};
    for (const [id, nameSet] of Object.entries(idToNames)) {
      result[id] = Array.from(nameSet).sort();
    }
    return result;
  }, [sessions]);

  // ---------- Computed: all players & stake levels ----------

  const allPlayers = useMemo(() => analysis?.allPlayers ?? [], [analysis]);
  const allStakeLevels = useMemo(() => analysis?.allStakeLevels ?? [], [analysis]);

  // ---------- Computed: filtered decisions ----------

  const filteredDecisions = useMemo((): PreflopDecision[] => {
    if (!analysis) return [];
    return filterDecisions(analysis.decisions, {
      playerName: selectedPlayer ?? undefined,
      stakeLevel: selectedStake ?? undefined,
      position: selectedPosition ?? undefined,
    });
  }, [analysis, selectedPlayer, selectedStake, selectedPosition]);

  // ---------- Computed: filtered player stats ----------

  const filteredPlayerStats = useMemo((): PlayerPreflopStats | null => {
    if (!selectedPlayer || !analysis) return null;
    return analysis.playerStats.get(selectedPlayer) ?? null;
  }, [analysis, selectedPlayer]);

  // ---------- Computed: total counts ----------

  const totalNlhHands = useMemo(
    () => sessions.reduce((sum, s) => sum + s.nlhHandCount, 0),
    [sessions],
  );

  const totalPloSkipped = useMemo(
    () => sessions.reduce((sum, s) => sum + s.ploSkippedCount, 0),
    [sessions],
  );

  // ---------- Position list ----------

  const allPositions: Position[] = [
    'BTN', 'SB', 'BB', 'STRADDLE', 'UTG', 'UTG1', 'MP', 'MP1', 'LJ', 'HJ', 'CO',
  ];

  return {
    // State
    sessions,
    config,
    analysis,
    allHands,

    // Filters
    selectedPlayer, setSelectedPlayer,
    selectedStake, setSelectedStake,
    selectedPosition, setSelectedPosition,

    // UI
    activeView, setActiveView,

    // Actions
    handleFileUpload,
    deleteSession,
    updateAliases,

    // Computed
    playerIdMap,
    allPlayers,
    allStakeLevels,
    allPositions,
    filteredDecisions,
    filteredPlayerStats,
    totalNlhHands,
    totalPloSkipped,
  };
}
