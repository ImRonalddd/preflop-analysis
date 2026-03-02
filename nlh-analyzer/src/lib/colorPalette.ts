import { ACTION_COLORS, ACTION_LABELS } from '@/types';
import type { PreflopAction } from '@/types';

export { ACTION_COLORS, ACTION_LABELS };

export const NIVO_THEME = {
  background: 'transparent',
  text: {
    fontSize: 12,
    fill: '#e2e8f0',
  },
  axis: {
    domain: {
      line: { stroke: '#475569', strokeWidth: 1 },
    },
    ticks: {
      line: { stroke: '#475569', strokeWidth: 1 },
      text: { fill: '#94a3b8', fontSize: 11 },
    },
    legend: {
      text: { fill: '#e2e8f0', fontSize: 12 },
    },
  },
  grid: {
    line: { stroke: '#1e293b', strokeWidth: 1 },
  },
  legends: {
    text: { fill: '#e2e8f0', fontSize: 11 },
  },
  tooltip: {
    container: {
      background: '#1e293b',
      color: '#e2e8f0',
      fontSize: 12,
      borderRadius: '8px',
      border: '1px solid #475569',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
    },
  },
  labels: {
    text: { fill: '#e2e8f0', fontSize: 11 },
  },
} as const;

export function getActionColor(action: PreflopAction): string {
  return ACTION_COLORS[action] ?? '#64748b';
}

export function getActionLabel(action: PreflopAction): string {
  return ACTION_LABELS[action] ?? action;
}
