# Changelog

## [2026.1.1] - 2026-06-05

### Changed
- **BREAKING:** renamed the component selector prefix `sl-*` → `cd-*`
  (`cd-signal-chart`, `cd-metric-card`, `cd-overview-strip`, `cd-detail-panel`,
  `cd-event-badges`, `cd-live-banner`). Consumer templates must update.
- **BREAKING:** renamed the CSS custom properties `--sl-*` → `--cd-*`
  (`--cd-card`, `--cd-border`, `--cd-primary`, `--cd-text-primary`,
  `--cd-text-secondary`). Apps that themed via the old vars must update.

### Added
- MIT `LICENSE`.
- `README.md` with usage and shared-library consumption guide.

## [2026.1.0] - 2026-04-02

### Added
- **SignalChartComponent** (`sl-signal-chart`) — Chart.js line chart with dark theme, annotation plugin, configurable height/scales
- **MetricCardComponent** (`sl-metric-card`) — label + value + unit display card
- **OverviewStripComponent** (`sl-overview-strip`) — clickable signal thumbnail grid
- **DetailPanelComponent** (`sl-detail-panel`) — zoomable chart with 30m/1h/2h/All range presets + slider
- **LiveBannerComponent** (`sl-live-banner`) — pulsing green LIVE indicator with timer
- **EventBadgesComponent** (`sl-event-badges`) — colored OA/CA/H/RERA count pills
- **chart-helpers.ts** — formatTimestamps, eventAnnotations, makeDataset, makeFillBand
- **theme.ts** — CPAPDASH_COLORS constants (signal colors, event colors, UI colors)
- CSS custom properties for theming (`--sl-card`, `--sl-primary`, etc.)
- Consumed via tsconfig paths: `"@cpapdash/charts"` → public-api.ts
