"use client";

import { useMemo } from 'react';
import { ResponsivePie } from '@nivo/pie';
import type { PreflopDecision, PreflopAction } from '@/types';
import { ACTION_COLORS, ACTION_LABELS } from '@/types';
import { NIVO_THEME } from '@/lib/colorPalette';

interface ActionDistributionChartProps {
  decisions: PreflopDecision[];
}

const ACTION_ORDER: PreflopAction[] = [
  'fold', 'limp', 'call_open', 'call_3bet', 'call_4bet_plus', 'open_raise', '3bet', '4bet', '5bet_plus', 'all_in',
];

export default function ActionDistributionChart({ decisions }: ActionDistributionChartProps) {
  const data = useMemo(() => {
    const counts = new Map<PreflopAction, number>();
    for (const d of decisions) {
      counts.set(d.action, (counts.get(d.action) ?? 0) + 1);
    }

    return ACTION_ORDER
      .filter(a => (counts.get(a) ?? 0) > 0)
      .map(a => ({
        id: ACTION_LABELS[a],
        label: ACTION_LABELS[a],
        value: counts.get(a) ?? 0,
        color: ACTION_COLORS[a],
      }));
  }, [decisions]);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs font-mono text-[var(--text-tertiary)]">
        No data
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsivePie
        data={data}
        colors={{ datum: 'data.color' }}
        margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
        innerRadius={0.5}
        padAngle={1}
        cornerRadius={3}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.6]] }}
        enableArcLinkLabels={true}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="var(--text-secondary)"
        arcLinkLabelsThickness={1}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={15}
        arcLabelsTextColor="#ffffff"
        theme={NIVO_THEME}
      />
    </div>
  );
}
