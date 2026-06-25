import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import * as Plotly from 'plotly.js-dist-min';
import { AirQualityData } from '../../services/supabase.service';
import {
  formatMetricValue,
  METRICS,
  MetricConfig,
} from '../../models/metric.model';

interface TimeRangeOption {
  label: string;
  value: number;
}

interface ChartRow {
  title: string;
  metric: MetricConfig;
}

interface HoverValue {
  label: string;
  value: string;
  color: string;
}

const CHART_ROWS: ChartRow[] = [
  {
    title: 'Air Quality',
    metric: METRICS.find((m) => m.key === 'iaq')!,
  },
  {
    title: 'Temperature',
    metric: METRICS.find((m) => m.key === 'temperature')!,
  },
  {
    title: 'Humidity',
    metric: METRICS.find((m) => m.key === 'humidity')!,
  },
  {
    title: 'Pressure',
    metric: METRICS.find((m) => m.key === 'pressure')!,
  },
];

const ROW_COUNT = CHART_ROWS.length;
const ROW_HEIGHT = 0.21;
const ROW_GAP = 0.05;

@Component({
  selector: 'app-history-chart',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatSlideToggleModule],
  templateUrl: './history-chart.component.html',
  styleUrls: ['./history-chart.component.scss'],
})
export class HistoryChartComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('chartDiv') chartDiv!: ElementRef<HTMLDivElement>;

  @Input() data: AirQualityData[] = [];
  @Input() rangeHours = 24;
  @Output() rangeHoursChange = new EventEmitter<number>();

  outdoor = false;

  readonly timeRanges: TimeRangeOption[] = [
    { label: '1h', value: 1 },
    { label: '6h', value: 6 },
    { label: '24h', value: 24 },
    { label: '7d', value: 168 },
  ];

  hoverX: number | null = null;
  hoverValues: HoverValue[] = [];
  isMobile = false;

  private initialized = false;
  private resizeObserver?: ResizeObserver;
  private mobileMediaQuery = window.matchMedia('(max-width: 600px)');
  private mediaQueryListener = (event: MediaQueryListEvent) => {
    this.isMobile = event.matches;
    this.draw();
  };

  ngAfterViewInit() {
    this.isMobile = this.mobileMediaQuery.matches;
    this.mobileMediaQuery.addEventListener('change', this.mediaQueryListener);
    this.draw();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.chartDiv.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.initialized && changes['data']) {
      this.draw();
    }
  }

  ngOnDestroy() {
    this.mobileMediaQuery.removeEventListener('change', this.mediaQueryListener);
    this.resizeObserver?.disconnect();
    if (this.chartDiv?.nativeElement) {
      Plotly.purge(this.chartDiv.nativeElement);
    }
  }

  onRangeChange(hours: number) {
    if (hours !== this.rangeHours) {
      this.rangeHoursChange.emit(hours);
    }
  }

  onOutdoorToggle(outdoor: boolean) {
    if (outdoor !== this.outdoor) {
      this.outdoor = outdoor;
      this.draw();
    }
  }

  private draw() {
    if (!this.chartDiv) {
      return;
    }

    const timestamps = this.data.map(
      (d) => new Date(d.timestamp_received),
    );

    const traces: Plotly.Data[] = [];
    CHART_ROWS.forEach((row, index) => {
      const { short: xShort } = this.getXAxisNames(index);
      const { short: yShort } = this.getYAxisNames(index);
      traces.push(this.buildTrace(row.metric, timestamps, xShort, yShort));
    });

    const layout = this.buildLayout();
    const config: Partial<Plotly.Config> = {
      responsive: true,
      displayModeBar: false,
    };

    Plotly.react(this.chartDiv.nativeElement, traces, layout, config).then(
      () => {
        this.initialized = true;
      },
    );
  }

  private buildTrace(
    metric: MetricConfig,
    timestamps: Date[],
    xaxis: string,
    yaxis: string,
  ): Plotly.Data {
    const values = this.data.map((d) => d[metric.key]);
    return {
      x: timestamps,
      y: values,
      name: metric.unit
        ? `${metric.label} (${metric.unit})`
        : metric.label,
      xaxis,
      yaxis,
      type: 'scatter',
      mode: 'lines',
      line: { color: metric.color, width: 2 },
      hovertemplate: `%{y:.${metric.decimals}f} ${metric.unit}<extra>${metric.label}</extra>`,
    } as Plotly.Data;
  }

  private buildLayout(): Partial<Plotly.Layout> {
    const layout: Partial<Plotly.Layout> = {
      autosize: true,
      margin: this.getMargins(),
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      hovermode: 'x unified',
      showlegend: true,
      legend: {
        orientation: 'h',
        y: this.isMobile ? 1.06 : 1.04,
        x: 0.5,
        xanchor: 'center',
      },
    };

    CHART_ROWS.forEach((row, index) => {
      const { layout: xLayout, short: xShort } = this.getXAxisNames(index);
      const { layout: yLayout, short: yShort } = this.getYAxisNames(index);
      const domain = this.rowDomain(index);
      const isBottomRow = index === ROW_COUNT - 1;

      (layout as Record<string, unknown>)[xLayout] = {
        domain: [0, 1],
        anchor: yShort,
        matches: index === 0 ? undefined : 'x',
        showticklabels: isBottomRow,
        title: isBottomRow ? { text: 'Time' } : undefined,
        showgrid: false,
      };

      (layout as Record<string, unknown>)[yLayout] = {
        domain,
        anchor: xShort,
        range: this.getMetricRange(row.metric),
        title: this.isMobile
          ? undefined
          : {
              text: row.metric.unit
                ? `${row.metric.label} (${row.metric.unit})`
                : row.metric.label,
            },
        color: row.metric.color,
        side: 'left',
        showgrid: true,
        zeroline: false,
      };
    });

    layout.annotations = this.isMobile ? this.buildTitleAnnotations() : [];
    layout.shapes = this.buildBackgroundShapes();

    return layout;
  }

  private getMargins(): { t: number; b: number; l: number; r: number } {
    return this.isMobile
      ? { t: 110, b: 50, l: 40, r: 20 }
      : { t: 80, b: 50, l: 70, r: 30 };
  }

  private getMetricRange(metric: MetricConfig): [number, number] {
    if (
      this.outdoor &&
      metric.outdoorMin !== undefined &&
      metric.outdoorMax !== undefined
    ) {
      return [metric.outdoorMin, metric.outdoorMax];
    }
    return [metric.min, metric.max];
  }

  private buildBackgroundShapes(): Partial<Plotly.Shape>[] {
    return CHART_ROWS.reduce((shapes, _row, index) => {
      if (index % 2 === 0) {
        const [y0, y1] = this.rowDomain(index);
        shapes.push({
          type: 'rect',
          xref: 'paper',
          yref: 'paper',
          x0: 0,
          x1: 1,
          y0,
          y1,
          fillcolor: 'rgba(0, 0, 0, 0.03)',
          line: { width: 0 },
          layer: 'below',
        });
      }
      return shapes;
    }, [] as Partial<Plotly.Shape>[]);
  }

  private buildTitleAnnotations(): Partial<Plotly.Annotations>[] {
    return CHART_ROWS.map((row, index) => {
      const [, y1] = this.rowDomain(index);
      const text = row.metric.unit
        ? `${row.metric.label} (${row.metric.unit})`
        : row.metric.label;
      return {
        x: 0.01,
        y: y1 - 0.005,
        xref: 'paper',
        yref: 'paper',
        text: `<b>${text}</b>`,
        showarrow: false,
        xanchor: 'left',
        yanchor: 'top',
        font: { color: row.metric.color, size: 12 },
        bgcolor: 'rgba(255, 255, 255, 0.8)',
        borderpad: 4,
      };
    });
  }

  private getXAxisNames(row: number): { layout: string; short: string } {
    return row === 0
      ? { layout: 'xaxis', short: 'x' }
      : { layout: `xaxis${row + 1}`, short: `x${row + 1}` };
  }

  private getYAxisNames(row: number): {
    layout: string;
    short: string;
  } {
    return row === 0
      ? { layout: 'yaxis', short: 'y' }
      : { layout: `yaxis${row + 1}`, short: `y${row + 1}` };
  }

  private rowDomain(row: number): [number, number] {
    const start = 1 - (row + 1) * ROW_HEIGHT - row * ROW_GAP;
    const end = 1 - row * ROW_HEIGHT - row * ROW_GAP;
    return [start, end];
  }

  private resize() {
    if (this.chartDiv?.nativeElement) {
      Plotly.Plots.resize(this.chartDiv.nativeElement);
    }
  }

  onMouseMove(event: MouseEvent) {
    if (this.data.length === 0) {
      return;
    }

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.hoverX = event.clientX - rect.left;

    const { l: plotLeft, r: plotRight } = this.getMargins();
    const plotWidth = rect.width - plotLeft - plotRight;
    const ratio =
      plotWidth > 0
        ? Math.max(
            0,
            Math.min(1, (this.hoverX - plotLeft) / plotWidth),
          )
        : 0;

    const start = new Date(this.data[0].timestamp_received).getTime();
    const end = new Date(
      this.data[this.data.length - 1].timestamp_received,
    ).getTime();
    const targetTime = start + ratio * (end - start);
    const pointNumber = this.findNearestIndexByTime(targetTime);

    this.hoverValues = this.buildHoverValues(pointNumber);
  }

  onMouseLeave() {
    this.hoverX = null;
    this.hoverValues = [];
  }

  private findNearestIndexByTime(targetTime: number): number {
    let best = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < this.data.length; i++) {
      const diff = Math.abs(
        new Date(this.data[i].timestamp_received).getTime() - targetTime,
      );
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    return best;
  }

  private buildHoverValues(pointNumber: number): HoverValue[] {
    const row = this.data[pointNumber];
    return CHART_ROWS.map((chartRow) => ({
      label: chartRow.metric.label,
      value: formatMetricValue(row[chartRow.metric.key], chartRow.metric),
      color: chartRow.metric.color,
    }));
  }
}
