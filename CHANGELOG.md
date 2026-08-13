# Changelog

## [2026.1.4] - 2026-08-12

### Added
- **Event duration boxes on the annotation layer (F1).** `eventAnnotations` now
  draws a translucent box spanning an event's `duration_seconds` rather than a
  single line, with a minimum width so a short event stays visible on a coarse
  axis, and keeps the dashed marker for zero-duration events like RERA. Adds
  `eventColor` for case-insensitive lookup, and colours for apnea, CSR and
  desaturation. Landed separately and released here.

  Its `duration_seconds` is typed `number | string`, because the API sends
  Postgres numerics quoted and the implementation already coerces with
  `Number()`. Declared as `number` alone, the cloud frontend could not compile
  against its own payload.

- **`card-time.ts` — a card timestamp is drawn on the PATIENT's clock** (SDD-057).
  A CPAP card records a wall clock and no zone. Turning that into a displayed
  time needs to know where the patient sleeps, and the answer is never the
  viewer's location: a night is an event in the patient's life, so it reads
  22:20 to them, to their spouse in another state, and to an admin in Miami.
  Two people discussing the same night say the same number.

  `setPatientTimeZone()` is called once by the host app from the account;
  `cardClock`, `cardClockSeconds`, `cardDate` and `cardSleepDay` render against
  it, and `parseCardInstant` repairs the bare two-digit offset PostgreSQL writes
  ("-04", which JS needs as "-04:00"). When the zone is unknown they fall back
  to the wall-clock digits as sent — not a cosmetic choice, since a row that was
  never moved off the server's zone has digits that ARE its wall clock, and
  assuming a zone would invent a shift that isn't there.

  It is a **separate entry point**, `@cpapdash/charts/card-time`, and consumers
  outside a chart route must import it from there: the cloud app needs it in a
  root-provided service, and reaching it through the barrel pulls the chart
  components — and with them Chart.js and chartjs-plugin-zoom — into the initial
  bundle, which grew it by 260 kB.

### Fixed
- **`formatTimestamps` no longer draws a chart axis in the viewer's timezone.**
  It read `getHours()` off a Date, so the same night drew at different hours
  depending on who opened it — a California viewer saw a 22:20 night at 13:20
  (CpapDash support ticket 72). It now delegates to `cardClock`.
- **`eventAnnotations` parses both sides of its comparison the same way.** The
  event timestamp and the series timestamps both went through `new Date()`
  without the bare-offset repair PostgreSQL's "-04" needs, so an event was being
  placed by comparing an instant against whatever the engine made of an
  unrepaired string. Both sides now go through `parseCardInstant`.

## [2026.1.1] - 2026-06-05

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
