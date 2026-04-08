import { ChartDataset } from 'chart.js';

/** Color map for respiratory event types. */
export const EVENT_COLORS: Record<string, string> = {
  obstructive_apnea: '#f87171',
  OBSTRUCTIVE: '#f87171',
  central_apnea: '#fb923c',
  CENTRAL: '#fb923c',
  hypopnea: '#fbbf24',
  HYPOPNEA: '#fbbf24',
  rera: '#4ade80',
  RERA: '#4ade80',
  clear_airway: '#60a5fa',
  CLEAR_AIRWAY: '#60a5fa',
};

/** Event object with a timestamp and type. */
export interface ChartEvent {
  event_timestamp: string;
  event_type: string;
}

/**
 * Convert ISO/datetime timestamps to HH:MM display labels.
 */
export function formatTimestamps(timestamps: string[]): string[] {
  return timestamps.map(ts => {
    if (!ts) return '';
    const d = new Date(ts.replace(' ', 'T'));
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  });
}

/**
 * Build Chart.js annotation objects (vertical dashed lines) for events.
 */
export function eventAnnotations(events: ChartEvent[], labels: string[], timestamps: string[]): any[] {
  if (!events?.length || !timestamps?.length) return [];

  const annotations: any[] = [];
  for (const e of events) {
    const eventTime = e.event_timestamp?.replace(' ', 'T');
    if (!eventTime) continue;
    const eventDate = new Date(eventTime);
    let closest = 0;
    let minDiff = Infinity;
    for (let i = 0; i < timestamps.length; i++) {
      const ts = new Date(timestamps[i].replace(' ', 'T'));
      const diff = Math.abs(ts.getTime() - eventDate.getTime());
      if (diff < minDiff) { minDiff = diff; closest = i; }
    }
    const color = EVENT_COLORS[e.event_type] || '#888';
    annotations.push({
      type: 'line',
      xMin: closest,
      xMax: closest,
      borderColor: color,
      borderWidth: 1,
      borderDash: [2, 2],
    });
  }
  return annotations;
}

/**
 * Create a Chart.js line dataset with sensible defaults for dark theme.
 */
export function makeDataset(
  label: string,
  data: (number | null)[],
  color: string,
  opts?: Partial<ChartDataset<'line'>>
): ChartDataset<'line'> {
  return {
    label,
    data: data as number[],
    borderColor: color,
    backgroundColor: color + '33',
    borderWidth: 1.5,
    pointRadius: 0,
    pointHitRadius: 4,
    tension: 0.2,
    fill: false,
    ...opts,
  };
}

/**
 * Create a min/max fill band (two datasets that fill between each other).
 */
export function makeFillBand(
  label: string,
  dataMin: (number | null)[],
  dataMax: (number | null)[],
  color: string
): ChartDataset<'line'>[] {
  return [
    {
      label: label + ' max',
      data: dataMax as number[],
      borderColor: 'transparent',
      backgroundColor: color + '18',
      borderWidth: 0,
      pointRadius: 0,
      tension: 0.2,
      fill: '+1',
    },
    {
      label: label + ' min',
      data: dataMin as number[],
      borderColor: 'transparent',
      backgroundColor: 'transparent',
      borderWidth: 0,
      pointRadius: 0,
      tension: 0.2,
      fill: false,
    },
  ];
}
