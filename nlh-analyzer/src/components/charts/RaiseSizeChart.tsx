"use client";

import { useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import type { PreflopDecision } from '@/types';
import { NIVO_THEME } from '@/lib/colorPalette';

interface RaiseSizeChartProps {
  decisions: PreflopDecision[];
}

export default function RaiseSizeChart({ decisions }: RaiseSizeChartProps) {
  const data = useMemo(() => {
    const raises = decisions.filter(d => d.raiseBB > 0);
    if (raises.length === 0) return [];

    // Build histogram buckets
    const buckets = [
      { label: '2-2.5x', min: 0, max: 2.5 },
      { label: '2.5-3x', min: 2.5, max: 3 },
      { label: '3-4x', min: 3, max: 4 },
      { label: '4-5x', min: 4, max: 5 },
      { label: '5-7x', min: 5, max: 7 },
      { label: '7-10x', min: 7, max: 10 },
      { label: '10x+', min: 10, max: Infinity },
    ];

    return buckets.map(b => ({
      bucket: b.label,
      count: raises.filter(r => r.raiseBB >= b.min && r.raiseBB < b.max).length,
    })).filter(b => b.count > 0);
  }, [decisions]);

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs font-mono text-[var(--text-tertiary)]">
        No raise data
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveBar
        data={data}
        keys={['count']}
        indexBy="bucket"
        margin={{ top: 10, right: 20, bottom: 40, left: 40 }}
        padding={0.3}
        colors={['#60a5fa']}
        borderRadius={2}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: -30,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
        }}
        labelSkipWidth={20}
        labelTextColor="#ffffff"
        theme={NIVO_THEME}
      />
    </div>
  );
}
