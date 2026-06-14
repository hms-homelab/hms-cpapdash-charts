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
  apnea: '#f87171',
  APNEA: '#f87171',
  csr: '#a78bfa',
  CSR: '#a78bfa',
  desaturation: '#fb923c',
  DESATURATION: '#fb923c',
};

/** Case-insensitive event color lookup ("Obstructive" -> OBSTRUCTIVE). */
export function eventColor(type: string): string {
  if (!type) return '#888';
  return EVENT_COLORS[type] || EVENT_COLORS[type.toUpperCase()] || EVENT_COLORS[type.toLowerCase()] || '#888';
}

/** Event object with a timestamp, type, and (optional) duration for span overlays. */
export interface ChartEvent {
  event_timestamp: string;
  event_type: string;
  duration_seconds?: number;
}

/** Fractional index of an absolute time within a (sorted) per-bucket timeline. */
function fractionalIndex(timeMs: number, tsMs: number[]): number {
  const n = tsMs.length;
  if (!n) return 0;
  if (timeMs <= tsMs[0]) return 0;
  if (timeMs >= tsMs[n - 1]) return n - 1;
  for (let i = 0; i < n - 1; i++) {
    if (timeMs >= tsMs[i] && timeMs < tsMs[i + 1]) {
      const span = tsMs[i + 1] - tsMs[i] || 1;
      return i + (timeMs - tsMs[i]) / span;
    }
  }
  return n - 1;
}

/**
 * Convert ISO/datetime timestamps to HH:MM display labels.
 */
export function formatTimestamps(timestamps: string[]): string[] {
  return timestamps.map(ts => {
    if (!ts) return '';
    let normalized = ts.replace(' ', 'T');
    // PostgreSQL timestamptz uses bare offsets like -04; JS needs -04:00
    normalized = normalized.replace(/([+-]\d{2})$/, '$1:00');
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return '';
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  });
}

/**
 * Build Chart.js annotation objects for events: a translucent box spanning the
 * event duration (F1), or a dashed marker line for zero-duration events (RERA).
 */
export function eventAnnotations(events: ChartEvent[], labels: string[], timestamps: string[]): any[] {
  if (!events?.length || !timestamps?.length) return [];

  const tsMs = timestamps.map(t => new Date((t || '').replace(' ', 'T')).getTime());
  // Minimum span width (index units) so short events stay visible on a coarse axis.
  const MIN_W = 0.35;

  const annotations: any[] = [];
  for (const e of events) {
    const eventTime = e.event_timestamp?.replace(' ', 'T');
    if (!eventTime) continue;
    const startMs = new Date(eventTime).getTime();
    const dur = Number(e.duration_seconds) || 0;
    const color = eventColor(e.event_type);

    if (dur > 0) {
      const x1 = fractionalIndex(startMs, tsMs);
      let x2 = fractionalIndex(startMs + dur * 1000, tsMs);
      if (x2 - x1 < MIN_W) x2 = x1 + MIN_W;
      annotations.push({ type: 'box', xMin: x1, xMax: x2, backgroundColor: color + '33', borderColor: color + '88', borderWidth: 1 });
    } else {
      const x = fractionalIndex(startMs, tsMs);
      annotations.push({ type: 'line', xMin: x, xMax: x, borderColor: color, borderWidth: 1, borderDash: [2, 2] });
    }
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
