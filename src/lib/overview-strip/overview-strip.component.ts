import { Component, Input, Output, EventEmitter, AfterViewInit, OnChanges, OnDestroy, SimpleChanges, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Chart, ChartDataset, registerables } from 'chart.js';
import { CPAPDASH_COLORS } from '../theme';

Chart.register(...registerables);

/** Descriptor for one signal in the overview grid. */
export interface SignalDef {
  key: string;
  title: string;
  unit: string;
  color: string;
  labels: string[];
  datasets: ChartDataset<'line'>[];
  yMin?: number;
  yMax?: number;
}

@Component({
  selector: 'sl-overview-strip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overview-grid">
      <div *ngFor="let sig of signals"
        class="overview-card"
        [class.selected]="selectedKey === sig.key"
        (click)="onSelect(sig)">
        <div class="overview-header">
          <span class="ov-title">{{ sig.title }}</span>
          <span class="ov-unit">{{ sig.unit }}</span>
        </div>
        <canvas [id]="'sl-ov-' + sig.key"></canvas>
      </div>
    </div>
  `,
  styles: [`
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 4px;
    }
    .overview-card {
      background: var(--sl-card, #1e1e2f);
      border: 2px solid transparent;
      border-radius: 6px;
      padding: 0.4rem 0.5rem 0.2rem;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .overview-card:hover { border-color: #444; }
    .overview-card.selected { border-color: var(--sl-primary, #64b5f6); }
    .overview-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .ov-title {
      color: #ccc;
      font-size: 0.65rem;
      font-weight: 600;
    }
    .ov-unit {
      color: #666;
      font-size: 0.6rem;
    }
    .overview-card canvas {
      width: 100% !important;
      height: 60px !important;
    }
    @media (max-width: 768px) {
      .overview-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class OverviewStripComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() signals: SignalDef[] = [];
  @Input() selectedKey = '';
  @Output() signalSelected = new EventEmitter<SignalDef>();

  private charts: Chart[] = [];

  ngAfterViewInit() {
    this.renderCharts();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['signals'] && !changes['signals'].firstChange) {
      this.destroyCharts();
      // Wait for DOM to update with new *ngFor items
      setTimeout(() => this.renderCharts(), 0);
    }
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  onSelect(sig: SignalDef) {
    this.signalSelected.emit(sig);
  }

  private destroyCharts() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  private platformId = inject(PLATFORM_ID);
  private renderCharts() {
    if (!isPlatformBrowser(this.platformId)) return;  // Chart.js needs a real canvas
    this.destroyCharts();

    for (const sig of this.signals) {
      const canvas = document.getElementById('sl-ov-' + sig.key) as HTMLCanvasElement;
      if (!canvas) continue;

      // Use provided datasets or build a simple one from the first dataset's data
      const datasets: ChartDataset<'line'>[] = sig.datasets.length
        ? sig.datasets.map(ds => ({
            ...ds,
            borderWidth: 1,
            pointRadius: 0,
            tension: 0.3,
            fill: true,
            backgroundColor: (ds.borderColor || sig.color) + '22',
          }))
        : [];

      const chart = new Chart(canvas, {
        type: 'line',
        data: { labels: sig.labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: {
            x: { display: false },
            y: { display: false, min: sig.yMin, max: sig.yMax },
          },
        },
      });
      this.charts.push(chart);
    }
  }
}
