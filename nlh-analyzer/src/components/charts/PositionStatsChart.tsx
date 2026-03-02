"use client";

import { useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import type { PreflopDecision, Position } from '@/types';
import { NIVO_THEME } from '@/lib/colorPalette';

interface PositionStatsChartProps {
  decisions: PreflopDecision[];
}

const POSITION_ORDER: Position[] = ['UTG', 'UTG1', 'MP', 'MP1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB', 'STRADDLE'];

export default function PositionStatsChart({ decisions }: PositionStatsChartProps) {
  const data = useMemo(() => {
    const posCounts = new Map<string, { total: number; vpip: number; pfr: number; threeBet: number }>();

    for (const d of decisions) {
      const pos = d.position;
      const existing = posCounts.get(pos) ?? { total: 0, vpip: 0, pfr: 0, threeBet: 0 };
      existing.total++;
      if (d.action !== 'fold') existing.vpip++;
      if (['open_raise', '3bet', '4bet', '5bet_plus', 'all_in'].includes(d.action)) existing.pfr++;
      if (d.action === '3bet') existing.threeBet++;
      posCounts.set(pos, existing);
    }

    return POSITION_ORDER
      .filter(pos => posCounts.has(pos))
      .map(pos => {
        const c = posCounts.get(pos)!;
        return {
          position: pos,
          VPIP: c.total > 0 ? Math.round((c.vpip / c.total) * 100) : 0,
          PFR: c.total > 0 ? Math.round((c.pfr / c.total) * 100) : 0,
          '3-Bet': c.total > 0 ? Math.round((c.threeBet / c.total) * 100) : 0,
        };
      });
  }, [decisions]);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs font-mono text-[var(--text-tertiary)]">
        No data
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveBar
        data={data}
        keys={['VPIP', 'PFR', '3-Bet']}
        indexBy="position"
        groupMode="grouped"
        margin={{ top: 10, right: 100, bottom: 40, left: 50 }}
        padding={0.3}
        colors={['#4ade80', '#f87171', '#c084fc']}
        borderRadius={2}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          format: (v: number) => `${v}%`,
        }}
        labelSkipWidth={20}
        labelSkipHeight={12}
        labelTextColor="#ffffff"
        legends={[
          {
            dataFrom: 'keys',
            anchor: 'bottom-right',
            direction: 'column',
            translateX: 100,
            itemsSpacing: 4,
            itemWidth: 80,
            itemHeight: 20,
            symbolSize: 12,
            symbolShape: 'circle',
          },
        ]}
        theme={NIVO_THEME}
      />
    </div>
  );
}
