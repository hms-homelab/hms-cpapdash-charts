import {
  Component, Input, ViewChild, ElementRef,
  AfterViewInit, OnChanges, OnDestroy, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartDataset, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { CPAPDASH_COLORS } from '../theme';

Chart.register(...registerables, annotationPlugin);

interface RangeOption {
  label: string;
  value: number | 'all';
}

@Component({
  selector: 'sl-detail-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="detail-section">
      <div class="detail-header">
        <h3>
          {{ title }} <span class="detail-unit" *ngIf="unit">({{ unit }})</span>
          <span class="odi-badge" *ngIf="odi !== null && odi !== undefined" [style.color]="odiColor"
            title="Oxygen Desaturation Index — desaturations ≥3% per hour">
            <i class="fa-solid fa-arrow-trend-down"></i> ODI {{ odi.toFixed(1) }}/hr
          </span>
        </h3>
        <div class="detail-controls">
          <div class="range-buttons">
            <button *ngFor="let r of rangeOptions"
              [class.active]="activeRange === r.value"
              (click)="setRange(r.value)">{{ r.label }}</button>
          </div>
        </div>
      </div>
      <div class="detail-chart-container">
        <canvas #detailCanvas></canvas>
      </div>
      <div class="slider-container" *ngIf="activeRange !== 'all'">
        <input type="range" class="time-slider"
          [min]="0" [max]="sliderMax"
          [(ngModel)]="sliderPos" (input)="onSliderChange()" />
        <div class="slider-labels">
          <span>{{ sliderStartLabel }}</span>
          <span>{{ sliderEndLabel }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .detail-section {
      background: var(--sl-card, #1e1e2f);
      border-radius: 8px;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
    }
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .detail-header h3 {
      color: #ccc;
      font-size: 0.9rem;
      margin: 0;
    }
    .detail-unit {
      color: var(--sl-text-secondary, #888);
      font-size: 0.75rem;
      font-weight: normal;
    }
    .detail-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .range-buttons { display: flex; gap: 2px; }
    .range-buttons button {
      background: #2a2a3a;
      border: 1px solid #444;
      color: #aaa;
      padding: 0.2rem 0.5rem;
      font-size: 0.7rem;
      cursor: pointer;
      border-radius: 3px;
    }
    .range-buttons button.active {
      background: var(--sl-primary, #64b5f6);
      color: #000;
      border-color: var(--sl-primary, #64b5f6);
    }
    .detail-chart-container {
      margin-top: 0.5rem;
      height: 300px;
      position: relative;
    }
    .detail-chart-container canvas {
      width: 100% !important;
      height: 100% !important;
    }
    .slider-container { margin-top: 0.5rem; }
    .time-slider {
      width: 100%;
      accent-color: var(--sl-primary, #64b5f6);
    }
    .slider-labels {
      display: flex;
      justify-content: space-between;
      color: var(--sl-text-secondary, #888);
      font-size: 0.65rem;
    }
    @media (max-width: 768px) {
      .detail-chart-container { height: 250px; }
    }
  `]
})
export class DetailPanelComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() title = '';
  @Input() unit = '';
  @Input() labels: string[] = [];
  @Input() datasets: ChartDataset<'line'>[] = [];
  @Input() annotations: any[] = [];
  @Input() height = 300;
  @Input() yMin?: number;
  @Input() yMax?: number;
  /** Oxygen Desaturation Index (desats/hr) — shows a badge in the header when set (F2). */
  @Input() odi: number | null = null;

  get odiColor(): string {
    const o = this.odi ?? 0;
    return o < 5 ? '#4ade80' : o < 15 ? '#fb923c' : '#ef4444';
  }

  @ViewChild('detailCanvas') detailCanvasRef!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  rangeOptions: RangeOption[] = [
    { label: '30m', value: 30 },
    { label: '1h', value: 60 },
    { label: '2h', value: 120 },
    { label: 'All', value: 'all' },
  ];
  activeRange: number | 'all' = 'all';
  sliderPos = 0;
  sliderMax = 100;
  sliderStartLabel = '';
  sliderEndLabel = '';

  private viewStart = 0;
  private viewEnd = 0;

  ngAfterViewInit() {
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.chart) {
      // Reset range when data changes
      if (changes['labels'] || changes['datasets']) {
        this.activeRange = 'all';
      }
      this.chart.destroy();
      this.chart = null;
      this.renderChart();
    }
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }

  setRange(range: number | 'all') {
    this.activeRange = range;
    if (range === 'all') {
      this.rerender();
      return;
    }
    this.sliderMax = Math.max(0, this.labels.length - range);
    this.sliderPos = 0;
    this.updateSliderWindow();
    this.rerender();
  }

  onSliderChange() {
    this.updateSliderWindow();
    this.rerender();
  }

  private updateSliderWindow() {
    if (this.activeRange === 'all') return;
    const range = this.activeRange as number;
    this.viewStart = this.sliderPos;
    this.viewEnd = Math.min(this.sliderPos + range, this.labels.length);
    this.sliderStartLabel = this.labels[this.viewStart] || '';
    this.sliderEndLabel = this.labels[this.viewEnd - 1] || '';
  }

  private rerender() {
    this.chart?.destroy();
    this.chart = null;
    this.renderChart();
  }

  private renderChart() {
    if (!this.detailCanvasRef?.nativeElement || !this.labels.length) return;

    let visibleLabels = this.labels;
    let visibleDatasets = this.datasets;
    let visibleAnnotations = this.annotations;

    if (this.activeRange !== 'all') {
      const s = this.viewStart;
      const e = this.viewEnd;
      visibleLabels = this.labels.slice(s, e);
      visibleDatasets = this.datasets.map(ds => ({
        ...ds,
        data: (ds.data as number[]).slice(s, e),
      }));
      // Re-index annotations that fall within the visible window
      visibleAnnotations = this.annotations
        .filter((a: any) => a.xMin >= s && a.xMin < e)
        .map((a: any) => ({ ...a, xMin: a.xMin - s, xMax: a.xMax - s }));
    }

    const canvas = this.detailCanvasRef.nativeElement;

    this.chart = new Chart(canvas, {
      type: 'line',
      data: { labels: visibleLabels, datasets: visibleDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: CPAPDASH_COLORS.card,
            titleColor: CPAPDASH_COLORS.textPrimary,
            bodyColor: '#ccc',
            borderColor: '#444',
            borderWidth: 1,
          },
          annotation: {
            annotations: visibleAnnotations.reduce((acc: any, a: any, i: number) => {
              acc['evt' + i] = a;
              return acc;
            }, {}),
          },
        },
        scales: {
          x: {
            ticks: {
              color: CPAPDASH_COLORS.textSecondary,
              font: { size: 10 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 20,
            },
            grid: { color: CPAPDASH_COLORS.grid },
          },
          y: {
            min: this.yMin,
            max: this.yMax,
            ticks: { color: CPAPDASH_COLORS.textSecondary, font: { size: 10 } },
            grid: { color: CPAPDASH_COLORS.grid },
          },
        },
      },
    });
  }
}
