import {
  Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output,
  PLATFORM_ID, inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Chart } from 'chart.js';

/** One entry of the legend: every colour and line the chart draws, named. */
export interface FrameLegendItem {
  label: string;
  color: string;
  /** A reference line (AHI 5, the usage target) rather than a series. */
  dashed?: boolean;
}

/** The visible x window, as indices into the chart's labels (both ends in). */
export interface FrameWindow {
  from: number;
  to: number;
  /** How many points the full chart holds. */
  total: number;
}

/** The frame's button names, translated by the caller. */
export interface FrameLabels {
  zoomIn: string;
  zoomOut: string;
  showAll: string;
  fullScreen: string;
  close: string;
  window: string;
}

const DEFAULT_LABELS: FrameLabels = {
  zoomIn: 'Zoom in', zoomOut: 'Zoom out', showAll: 'Show all',
  fullScreen: 'Full screen', close: 'Close', window: 'Visible range',
};

let zoomLoaded: Promise<void> | null = null;

/**
 * chartjs-plugin-zoom, registered once for the whole app. Loaded
 * on demand: it pulls hammerjs, which touches `window` at import time and so
 * cannot sit in a module that SSR evaluates.
 */
export function ensureChartZoom(): Promise<void> {
  zoomLoaded ??= import('chartjs-plugin-zoom').then((m) => { Chart.register(m.default); });
  return zoomLoaded;
}

/**
 * One frame around any Chart.js chart. The
 * title, a legend naming every colour and line, zoom in / zoom out / show
 * all, full screen with a close, and a range slider under the plot while it
 * is zoomed. The caller projects the canvas, and an explain button into
 * `[frameActions]`, and hands the chart in once it exists; `windowChange`
 * tells it what is visible, so the explanation is about the same range.
 */
@Component({
  selector: 'sl-chart-frame',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="frame" [class.full]="isFull">
      <div class="frame-head">
        <h4 class="frame-title" *ngIf="title">{{ title }}</h4>
        <div class="frame-tools">
          <ng-content select="[frameActions]"></ng-content>
          <ng-container *ngIf="zoomable && chart">
            <button type="button" class="tool" (click)="zoom(1.5)" [attr.aria-label]="l.zoomIn" [title]="l.zoomIn" data-testid="frame-zoom-in">+</button>
            <button type="button" class="tool" (click)="zoom(1 / 1.5)" [attr.aria-label]="l.zoomOut" [title]="l.zoomOut" data-testid="frame-zoom-out">&minus;</button>
            <button type="button" class="tool" (click)="showAll()" [disabled]="!zoomed" [attr.aria-label]="l.showAll" [title]="l.showAll" data-testid="frame-show-all">&#8634;</button>
          </ng-container>
          <button type="button" class="tool" *ngIf="!isFull" (click)="enterFull()" [attr.aria-label]="l.fullScreen" [title]="l.fullScreen" data-testid="frame-full">&#x26F6;</button>
          <button type="button" class="tool close" *ngIf="isFull" (click)="exitFull()" [attr.aria-label]="l.close" [title]="l.close" data-testid="frame-close">&times;</button>
        </div>
      </div>
      <div class="frame-body"><ng-content></ng-content></div>
      <div class="frame-brush" *ngIf="zoomed && win">
        <input type="range" [min]="0" [max]="win.total - 1 - (win.to - win.from)" [value]="win.from"
               (input)="slide(+$any($event.target).value)" [attr.aria-label]="l.window" data-testid="frame-brush" />
      </div>
      <ul class="frame-legend" *ngIf="legend.length">
        <li *ngFor="let i of legend">
          <span class="swatch" [class.dashed]="i.dashed" [style.borderColor]="i.color" [style.background]="i.dashed ? 'transparent' : i.color"></span>{{ i.label }}
        </li>
      </ul>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .frame { display: flex; flex-direction: column; gap: 0.5rem; }
    .frame.full { position: fixed; inset: 0; z-index: 1000; padding: 1rem; background: var(--sl-bg, #0B0E15); }
    .frame.full .frame-body { flex: 1; min-height: 0; }
    .frame-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
    .frame-title { margin: 0; font-size: 1rem; font-weight: 600; color: var(--sl-ink, #EEF2FB); }
    .frame-tools { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }
    .tool {
      min-width: 2rem; height: 2rem; padding: 0 0.4rem; border-radius: 6px; cursor: pointer;
      border: 1px solid var(--sl-border, #2A2D45); background: transparent;
      color: var(--sl-ink, #EEF2FB); font-size: 1rem; line-height: 1;
    }
    .tool:disabled { opacity: 0.4; cursor: default; }
    .tool:focus-visible { outline: 2px solid var(--sl-primary, #8B8CFF); outline-offset: 2px; }
    .frame-body { position: relative; }
    .frame-brush input { width: 100%; }
    .frame-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.35rem 1rem; }
    .frame-legend li { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.875rem; color: var(--sl-ink, #EEF2FB); }
    .swatch { width: 14px; height: 0; border-top: 3px solid; display: inline-block; border-radius: 2px; }
    .swatch.dashed { border-top-style: dashed; }
  `],
})
export class ChartFrameComponent implements OnDestroy {
  private host = inject(ElementRef<HTMLElement>);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));

  @Input() title = '';
  @Input() legend: FrameLegendItem[] = [];
  /** Zoom along x. Off for a chart whose x is not a sequence (a pie, a bar per type). */
  @Input() zoomable = true;
  @Input() set labels(v: Partial<FrameLabels> | undefined) { this.l = { ...DEFAULT_LABELS, ...(v ?? {}) }; }
  l: FrameLabels = DEFAULT_LABELS;

  /** The chart, once the caller has built it. Wiring zoom needs the instance. */
  @Input() set chart(c: Chart | undefined | null) {
    this._chart = c ?? undefined;
    this.win = undefined;
    if (c && this.zoomable && this.browser) void this.wireZoom(c);
  }
  get chart(): Chart | undefined { return this._chart; }
  private _chart?: Chart;

  /** A long range opens on its newest N points, the rest a pan or Show all away. */
  @Input() openOn = 0;

  @Output() windowChange = new EventEmitter<FrameWindow | null>();

  win?: FrameWindow;
  isFull = false;

  get zoomed(): boolean {
    return !!this.win && (this.win.from > 0 || this.win.to < this.win.total - 1);
  }

  private async wireZoom(c: Chart): Promise<void> {
    await ensureChartZoom();
    if (c !== this._chart) return;
    const opts: any = c.options;
    opts.plugins ??= {};
    opts.plugins.zoom = {
      limits: { x: { min: 'original', max: 'original', minRange: 2 } },
      pan: { enabled: true, mode: 'x', onPanComplete: () => this.readWindow() },
      zoom: { wheel: { enabled: false }, pinch: { enabled: true }, mode: 'x', onZoomComplete: () => this.readWindow() },
    };
    c.update('none');
    const total = (c.data.labels ?? []).length;
    if (this.openOn > 0 && total > this.openOn) {
      (c as any).zoomScale('x', { min: total - this.openOn, max: total - 1 }, 'none');
    }
    this.readWindow();
  }

  /** The window as indices into the labels, from the x scale. */
  readWindow(): void {
    const c = this._chart;
    if (!c) return;
    const total = (c.data.labels ?? []).length;
    const x: any = c.scales['x'];
    if (!x || !total) { this.win = undefined; return; }
    const from = Math.max(0, Math.round(x.min));
    const to = Math.min(total - 1, Math.round(x.max));
    this.win = { from, to, total };
    this.windowChange.emit(this.zoomed ? this.win : null);
  }

  zoom(factor: number): void {
    const c: any = this._chart;
    if (!c?.zoom) return;
    c.zoom({ x: factor }, 'none');
    this.readWindow();
  }

  showAll(): void {
    const c: any = this._chart;
    if (!c?.resetZoom) return;
    c.resetZoom('none');
    this.readWindow();
  }

  /** The slider moves the window, its width kept. */
  slide(from: number): void {
    const c: any = this._chart;
    if (!c?.zoomScale || !this.win) return;
    const width = this.win.to - this.win.from;
    c.zoomScale('x', { min: from, max: from + width }, 'none');
    this.readWindow();
  }

  /** Full screen: the Fullscreen API where there is one, a fixed overlay otherwise. */
  enterFull(): void {
    this.isFull = true;
    const el = this.host.nativeElement as HTMLElement;
    if (this.browser && el.requestFullscreen) el.requestFullscreen().catch(() => {});
    this.resizeSoon();
  }

  exitFull(): void {
    this.isFull = false;
    if (this.browser && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    this.resizeSoon();
  }

  @HostListener('document:fullscreenchange')
  onFullChange(): void {
    if (this.isFull && this.browser && !document.fullscreenElement) {
      this.isFull = false;
      this.resizeSoon();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.isFull) this.exitFull(); }

  private resizeSoon(): void {
    if (this.browser) requestAnimationFrame(() => this._chart?.resize());
  }

  ngOnDestroy(): void {
    if (this.isFull && this.browser && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
}
