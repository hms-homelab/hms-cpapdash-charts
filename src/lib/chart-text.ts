import { Chart } from 'chart.js';

/** Chart text sizes, set once for every chart. */
export const CHART_TEXT = {
  /** Axis ticks and tooltips. */
  tick: 13,
  /** Legend entries. */
  legend: 14,
  /** The ink colour: ticks were #888 and hard to read on the dark card. */
  ink: '#EEF2FB',
  muted: '#B4BDD0',
} as const;

let applied = false;

/**
 * Readable chart text, set once through `Chart.defaults` rather than per
 * chart: ticks 13 px in the ink colour, legends 14 px. A chart that sets its
 * own size still wins; this is the floor every other chart starts from.
 */
export function applyReadableChartText(): void {
  if (applied) return;
  applied = true;
  Chart.defaults.font.size = CHART_TEXT.tick;
  Chart.defaults.color = CHART_TEXT.ink;
  const legend: any = Chart.defaults.plugins.legend;
  legend.labels = { ...(legend.labels ?? {}), color: CHART_TEXT.ink, font: { size: CHART_TEXT.legend } };
  const tooltip: any = Chart.defaults.plugins.tooltip;
  tooltip.bodyFont = { ...(tooltip.bodyFont ?? {}), size: CHART_TEXT.tick };
  tooltip.titleFont = { ...(tooltip.titleFont ?? {}), size: CHART_TEXT.tick };
}
