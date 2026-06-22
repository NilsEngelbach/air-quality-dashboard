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

interface ChartGroup {
  title: string;
  left: MetricConfig;
  right: MetricConfig;
}

interface HoverValue {
  label: string;
  value: string;
  color: string;
}

const CHART_GROUPS: ChartGroup[] = [
  {
    title: 'Air Quality',
    left: METRICS.find((m) => m.key === 'iaq')!,
    right: METRICS.find((m) => m.key === 'co2')!,
  },
  {
    title: 'Comfort',
    left: METRICS.find((m) => m.key === 'temperature')!,
    right: METRICS.find((m) => m.key === 'humidity')!,
  },
  {
    title: 'Other',
    left: METRICS.find((m) => m.key === 'voc')!,
    right: METRICS.find((m) => m.key === 'pressure')!,
  },
];

const ROW_COUNT = CHART_GROUPS.length;
const ROW_HEIGHT = 0.3;
const ROW_GAP = 0.035;

@Component({
  selector: 'app-history-chart',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
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

  readonly timeRanges: TimeRangeOption[] = [
    { label: '1h', value: 1 },
    { label: '6h', value: 6 },
    { label: '24h', value: 24 },
    { label: '7d', value: 168 },
  ];

  hoverX: number | null = null;
  hoverValues: HoverValue[] = [];

  private initialized = false;
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit() {
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

  private draw() {
    if (!this.chartDiv) {
      return;
    }

    const timestamps = this.data.map(
      (d) => new Date(d.timestamp_received),
    );

    const traces: Plotly.Data[] = [];
    CHART_GROUPS.forEach((group, row) => {
      const { short: xShort } = this.getXAxisNames(row);
      const { leftShort } = this.getYAxisNames(row);

      traces.push(
        this.buildTrace(group.left, timestamps, xShort, leftShort),
      );
      traces.push(
        this.buildTrace(group.right, timestamps, xShort, `y${2 * row + 2}`),
      );
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
      margin: { t: 50, b: 50, l: 60, r: 60 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      hovermode: 'x unified',
      showlegend: true,
      legend: {
        orientation: 'h',
        y: 1.02,
        x: 0.5,
        xanchor: 'center',
      },
    };

    CHART_GROUPS.forEach((group, row) => {
      const { layout: xLayout, short: xShort } = this.getXAxisNames(row);
      const {
        leftLayout,
        leftShort,
        rightLayout,
      } = this.getYAxisNames(row);
      const domain = this.rowDomain(row);
      const isBottomRow = row === ROW_COUNT - 1;

      (layout as Record<string, unknown>)[xLayout] = {
        domain: [0, 1],
        anchor: leftShort,
        matches: row === 0 ? undefined : 'x',
        showticklabels: isBottomRow,
        title: isBottomRow ? { text: 'Time' } : undefined,
        showgrid: false,
      };

      (layout as Record<string, unknown>)[leftLayout] = {
        domain,
        anchor: xShort,
        title: {
          text: group.left.unit
            ? `${group.left.label} (${group.left.unit})`
            : group.left.label,
        },
        color: group.left.color,
        side: 'left',
        showgrid: true,
        zeroline: false,
      };

      (layout as Record<string, unknown>)[rightLayout] = {
        domain,
        anchor: xShort,
        overlaying: leftShort,
        title: {
          text: group.right.unit
            ? `${group.right.label} (${group.right.unit})`
            : group.right.label,
        },
        color: group.right.color,
        side: 'right',
        showgrid: false,
        zeroline: false,
        showline: false,
      };
    });

    return layout;
  }

  private getXAxisNames(row: number): { layout: string; short: string } {
    return row === 0
      ? { layout: 'xaxis', short: 'x' }
      : { layout: `xaxis${row + 1}`, short: `x${row + 1}` };
  }

  private getYAxisNames(row: number): {
    leftLayout: string;
    leftShort: string;
    rightLayout: string;
    rightShort: string;
  } {
    const leftIndex = 2 * row + 1;
    const rightIndex = 2 * row + 2;
    return {
      leftLayout: row === 0 ? 'yaxis' : `yaxis${leftIndex}`,
      leftShort: row === 0 ? 'y' : `y${leftIndex}`,
      rightLayout: `yaxis${rightIndex}`,
      rightShort: `y${rightIndex}`,
    };
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

    const plotLeft = 60;
    const plotRight = 60;
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
    return METRICS.map((metric) => ({
      label: metric.label,
      value: formatMetricValue(row[metric.key], metric),
      color: metric.color,
    }));
  }
}
