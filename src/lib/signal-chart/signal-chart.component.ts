import { Component, Input, ViewChild, ElementRef, AfterViewInit, OnChanges, OnDestroy } from '@angular/core';
import { Chart, ChartDataset, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { CPAPDASH_COLORS } from '../theme';

Chart.register(...registerables, annotationPlugin);

@Component({
  selector: 'sl-signal-chart',
  standalone: true,
  template: `
    <div class="chart-card">
      <div class="chart-header">
        <span class="chart-title">{{ title }}</span>
        <span class="chart-unit">{{ unit }}</span>
      </div>
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [`
    .chart-card {
      background: var(--sl-card, #1e1e2f);
      border-radius: 8px;
      padding: 0.5rem 0.75rem 0.25rem;
      margin-bottom: 4px;
    }
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }
    .chart-title {
      color: var(--sl-text-primary, #e0e0e0);
      font-size: 0.75rem;
      font-weight: 600;
    }
    .chart-unit {
      color: var(--sl-text-secondary, #888);
      font-size: 0.65rem;
    }
    canvas { width: 100% !important; }
  `]
})
export class SignalChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() title = '';
  @Input() unit = '';
  @Input() labels: string[] = [];
  @Input() datasets: ChartDataset<'line'>[] = [];
  @Input() annotations: any[] = [];
  @Input() height = 120;
  @Input() yMin?: number;
  @Input() yMax?: number;

  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  ngAfterViewInit() {
    this.renderChart();
  }

  ngOnChanges() {
    if (this.chart) {
      this.chart.destroy();
      this.renderChart();
    }
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }

  private renderChart() {
    if (!this.canvasRef?.nativeElement || !this.labels.length) return;
    const canvas = this.canvasRef.nativeElement;
    canvas.height = this.height;

    const skip = Math.max(1, Math.floor(this.labels.length / 20));

    this.chart = new Chart(canvas, {
      type: 'line',
      data: { labels: this.labels, datasets: this.datasets },
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
            borderColor: CPAPDASH_COLORS.border,
            borderWidth: 1,
          },
          annotation: {
            annotations: this.annotations.reduce((acc: any, a: any, i: number) => {
              acc['evt' + i] = a;
              return acc;
            }, {}),
          },
        },
        scales: {
          x: {
            ticks: {
              color: CPAPDASH_COLORS.textSecondary,
              font: { size: 9 },
              maxRotation: 0,
              autoSkip: false,
              callback: (_val: any, idx: number) => idx % skip === 0 ? this.labels[idx] : '',
            },
            grid: { color: CPAPDASH_COLORS.grid },
          },
          y: {
            min: this.yMin,
            max: this.yMax,
            ticks: { color: CPAPDASH_COLORS.textSecondary, font: { size: 9 } },
            grid: { color: CPAPDASH_COLORS.grid },
          },
        },
      },
    });
  }
}
