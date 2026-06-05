# hms-cpapdash-charts

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-%23FFDD00.svg?logo=buy-me-a-coffee)](https://www.buymeacoffee.com/aamat09)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Shared Angular component library (`@cpapdash/charts`) for visualizing CPAP therapy data. It is the single set of chart and summary components reused across the [CpapDash](https://www.cpapdash.com/opensource) apps, so the web dashboard and companion app render therapy data the same way.

Built on [Chart.js](https://www.chartjs.org/) with `chartjs-plugin-annotation`. All components are standalone.

## Components

| Selector | Component | Purpose |
|----------|-----------|---------|
| `sl-signal-chart` | `SignalChartComponent` | Line chart for a therapy signal (flow, pressure, …) with annotations |
| `sl-metric-card` | `MetricCardComponent` | Single labelled metric (e.g. AHI) with unit |
| `sl-overview-strip` | `OverviewStripComponent` | Row of headline metrics for a session |
| `sl-detail-panel` | `DetailPanelComponent` | Expanded per-signal / per-event detail view |
| `sl-event-badges` | `EventBadgesComponent` | Inline badges for sleep events |
| `sl-live-banner` | `LiveBannerComponent` | Live-session status banner |

Plus `chart-helpers` (dataset builders) and `theme` (shared chart theming) from the public API.

## Quick Start

```ts
import { Component } from '@angular/core';
import { SignalChartComponent, MetricCardComponent } from '@cpapdash/charts';
import { ChartDataset } from 'chart.js';

@Component({
  selector: 'app-session',
  standalone: true,
  imports: [SignalChartComponent, MetricCardComponent],
  template: `
    <sl-metric-card label="AHI" [value]="ahi" unit="/h"></sl-metric-card>
    <sl-signal-chart
      title="Flow Rate" unit="L/min"
      [labels]="labels" [datasets]="datasets" [height]="160">
    </sl-signal-chart>
  `
})
export class SessionComponent {
  ahi = '4.2';
  labels: string[] = [];
  datasets: ChartDataset<'line'>[] = [];
}
```

## Peer Dependencies

Provided by the host app:

- `@angular/common`, `@angular/core` — `^19 || ^20 || ^21`
- `chart.js` — `^4`
- `chartjs-plugin-annotation` — `^3`

## Use as a Shared Library

This is an [ng-packagr](https://github.com/ng-packagr/ng-packagr) library — it is built, then consumed as `@cpapdash/charts`. Two ways:

### 1. Import — build and install the package

Build the library and install the packaged output into the consuming app. Best
when the consumer doesn't keep a local checkout.

```bash
# in this repo
ng build cpapdash-charts            # emits dist/cpapdash-charts
cd dist/cpapdash-charts && npm pack # -> cpapdash-charts-<version>.tgz

# in the consuming app
npm install /path/to/cpapdash-charts-<version>.tgz
```

> A tag-triggered CI publish (npm / GitHub Packages) is the intended long-term
> distribution so consumers can `npm install @cpapdash/charts` directly.

### 2. Direct reference — local workspace path

How the CpapDash apps consume it during development: include this library in the
Angular workspace and map the package name to its source/built output so edits
are picked up without re-packing.

```jsonc
// tsconfig.json (consuming workspace)
{
  "compilerOptions": {
    "paths": {
      "@cpapdash/charts": ["./projects/hms-cpapdash-charts/src/public-api.ts"]
    }
  }
}
```

Then import the standalone components directly: `import { SignalChartComponent } from '@cpapdash/charts';`.

## Related Projects

- [hms-cpapdash-parser](https://github.com/hms-homelab/hms-cpapdash-parser) — C++ parser that produces the therapy data these charts render
- [hms-cpap](https://github.com/hms-homelab/hms-cpap) — Home Assistant CPAP data collection service
- [CpapDash](https://www.cpapdash.com/opensource) — CPAP therapy companion (web + app)
