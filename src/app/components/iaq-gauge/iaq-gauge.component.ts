import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import * as Plotly from 'plotly.js-dist-min';
import {
  getAccuracyLabel,
  getIaqBand,
  IAQ_BANDS,
} from '../../models/metric.model';

@Component({
  selector: 'app-iaq-gauge',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './iaq-gauge.component.html',
  styleUrls: ['./iaq-gauge.component.scss'],
})
export class IaqGaugeComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('gaugeDiv') gaugeDiv!: ElementRef<HTMLDivElement>;

  @Input() iaq?: number;
  @Input() accuracy?: number;
  @Input() lastUpdated?: string;

  private initialized = false;
  private resizeObserver?: ResizeObserver;

  get iaqBand() {
    return getIaqBand(this.iaq ?? 0);
  }

  get iaqLabel(): string {
    return this.iaq !== undefined && !Number.isNaN(this.iaq)
      ? this.iaqBand.label
      : 'No data';
  }

  get accuracyLabel(): string {
    return getAccuracyLabel(this.accuracy ?? -1).label;
  }

  get accuracyColor(): string {
    return getAccuracyLabel(this.accuracy ?? -1).color;
  }

  ngAfterViewInit() {
    this.draw();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.gaugeDiv.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.initialized && (changes['iaq'] || changes['accuracy'])) {
      this.draw();
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    if (this.gaugeDiv?.nativeElement) {
      Plotly.purge(this.gaugeDiv.nativeElement);
    }
  }

  private draw() {
    if (!this.gaugeDiv) {
      return;
    }

    const value = this.iaq ?? 0;
    const band = this.iaqBand;

    const data: Partial<Plotly.Data>[] = [
      {
        type: 'indicator',
        mode: 'gauge+number',
        value,
        number: {
          suffix: '',
          font: { size: 48 },
        },
        gauge: {
          axis: {
            range: [0, 500],
            tickmode: 'array',
            tickvals: IAQ_BANDS.map((b) => (b.min + b.max) / 2),
            ticktext: IAQ_BANDS.map((b) => b.label),
          },
          bar: { color: this.darkenColor(band.color, 0.35), thickness: 0.75 },
          bgcolor: 'transparent',
          borderwidth: 0,
          steps: IAQ_BANDS.map((b) => ({
            range: [b.min, b.max],
            color: b.color,
          })),
        },
      },
    ];

    const layout: Partial<Plotly.Layout> = {
      autosize: true,
      margin: { t: 30, b: 10, l: 30, r: 30 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { family: 'Roboto, sans-serif' },
    };

    const config: Partial<Plotly.Config> = {
      responsive: true,
      displayModeBar: false,
    };

    Plotly.react(this.gaugeDiv.nativeElement, data, layout, config).then(
      () => {
        this.initialized = true;
      },
    );
  }

  private resize() {
    if (this.gaugeDiv?.nativeElement) {
      Plotly.Plots.resize(this.gaugeDiv.nativeElement);
    }
  }

  private darkenColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    if (hex.length !== 3 && hex.length !== 6) {
      return color;
    }
    const pieces =
      hex.length === 3
        ? hex.split('').map((c) => c + c)
        : [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)];
    const [r, g, b] = pieces.map((piece) => {
      const value = parseInt(piece, 16);
      return Math.max(0, Math.round(value * (1 - amount)))
        .toString(16)
        .padStart(2, '0');
    });
    return `#${r}${g}${b}`;
  }
}
