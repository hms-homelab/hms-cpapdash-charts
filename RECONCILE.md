# Chart-library reconcile — state & remaining work

**Goal:** make the public **`@cpapdash/charts`** library (this repo) the single
source of truth for the Angular chart components, consumed by **both** frontends
so chart code (and the F2 SpO2-desaturation feature) lives once.

The three things had drifted into parallel copies:
- **this lib** (`@cpapdash/charts`, ng-packagr) — was published-but-unconsumed.
- **hms-cpapdash-api** (cloud, cpapdash.com) — had a *vendored copy* at
  `frontend/src/app/charts` aliased `@cpapdash/charts`.
- **hms-cpap** (homelab, served on 192.168.2.15) — never used the lib at all;
  its `frontend/src/app/pages/session-detail/session-detail.component.ts`
  **inlines** chart rendering (`renderDetailChart` / `renderOverviewCharts`)
  plus `utils/chart-helpers.ts`.

## DONE (2026-06-14)

**Stage 1 — F2 into the lib.**
- `src/lib/signal-analysis.ts` — rolling-baseline SpO2 desaturation detector
  (mirrors the C++ `DesatDetector`): `detectDesaturations`, `desatAnnotations`,
  `odiPerHour`, `inferSampleSec`. Exported from `public-api`.
- `detail-panel` — optional `[odi]` input → ODI/hr badge in the header.
- Tag **`v2026.1.2`**.

**Stage 1.5 — lib is a superset (merge cloud's drift in).**
- Brought the cloud's more-evolved components into the lib: **SSR-safety**
  (`isPlatformBrowser`/`PLATFORM_ID` guard — Chart.js can't run during
  prerender) in detail-panel / signal-chart / overview-strip, plus the cloud's
  metric-card + chart-helpers updates. Re-applied F2 on top.
- Tag **`v2026.1.3`** ← the cloud currently pins this.

**Stage 2 — cloud consumes the lib.**
- Cloud added this repo as a **git submodule** at
  `frontend/libs/cpapdash-charts` (pinned `v2026.1.3`); `tsconfig.json` alias
  `@cpapdash/charts` → `./libs/cpapdash-charts/src/public-api`; the vendored
  `frontend/src/app/charts` copy was **deleted**.
- F2 wired in the cloud's `session-detail` (detect desats on the SpO2 series,
  O2Ring fallback when EDF has no SpO2, pass `[annotations]` + `[odi]`).
- **Built + deployed to cpapdash.com** (S3 + CloudFront). F2 is live.

**Also on `master` (UNTAGGED — no consumer has it yet):**
- `chart-helpers.ts` `eventAnnotations` upgraded to **F1 duration boxes**
  (translucent box spanning `duration_seconds`, dashed line for zero-duration)
  + `eventColor()` + `fractionalIndex()`. Ported from hms-cpap.
  Rolling this out = re-tag the lib + bump the cloud submodule + redeploy.

## DEFERRED — remaining reconcile work

**S3a — finish the lib superset (additive, low risk; benefits the cloud too).**
hms-cpap's inline charts are AHEAD of the lib on three things the lib's
`detail-panel` still lacks; port them in before migrating hms-cpap:
1. **F1 box-span event annotations** — already on lib `master` (untagged), need
   to tag + roll out.
2. **Chart zoom** — `chartjs-plugin-zoom` (wheel/pinch/pan + zoom in/out/reset
   buttons). See hms-cpap `session-detail.component.ts` (`zoomPlugin`, the
   `zoom:` plugin block).
3. **Full-screen toggle** — `isExpanded` + `.expanded { position:fixed; inset:0 }`
   CSS + `chart.resize()`. See hms-cpap (`toggleExpand`, `isExpanded`, ~9 refs).
Then tag (e.g. `v2026.2.0`) and bump the **cloud** submodule + redeploy so the
cloud gains F1 boxes + zoom + full-screen.

**S3b — migrate hms-cpap onto the lib (the big, risky one).**
- Add this repo as a submodule to **hms-cpap/frontend** + tsconfig alias
  `@cpapdash/charts`.
- Rewrite `session-detail.component.ts` to use `<sl-detail-panel>` +
  `<sl-overview-strip>` instead of the inline `renderDetailChart` /
  `renderOverviewCharts`; delete `utils/chart-helpers.ts` (use the lib's).
- Preserve hms-cpap-only behaviors: range buttons + slider, overview sparklines,
  event doughnut, **compare-nights** (`compare.component.ts`), zoom, full-screen,
  and **F2** (currently inline in hms-cpap via its own `utils/signal-analysis.ts`).
- hms-cpap is a **live deployed app** (service on 192.168.2.15, served from
  `frontend/dist/frontend/browser`). Rebuild the frontend on .15 + verify
  (ng serve + Playwright against the .15 backend) before shipping. Re-tag hms-cpap.

### Verification notes (.15 data is sparse)
- Machine SpO2 (`cpap_vitals.spo2`) is NULL on .15 — SpO2 comes from the
  **O2Ring** (`oximetry_*`), so F2 runs on the O2Ring fallback. Good test night:
  **sleep_day `2026-05-05`** (O2Ring ~5189 samples, ~67 desats, ODI ~15.5).
  Session-detail dates use the `sleep_day` field, not the calendar date.
- F2 verified working on hms-cpap (`ng serve` → .15 → Playwright): 67 desat
  span boxes + "ODI 15.5/hr" badge on the O2Ring SpO2 chart.

## Pointers
- Lib entry: `src/public-api.ts`. Components: `src/lib/{detail-panel,signal-chart,
  overview-strip,metric-card,event-badges,live-banner}`, `chart-helpers.ts`,
  `signal-analysis.ts`, `theme.ts`. Build: `npm run build` (ng-packagr).
- hms-cpap inline charts: `frontend/src/app/pages/session-detail/` +
  `frontend/src/app/utils/{chart-helpers,signal-analysis}.ts`.
- cloud consumer: `frontend/src/app/pages/session-detail/session-detail.component.ts`
  (already on the lib).
