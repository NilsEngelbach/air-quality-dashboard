export type MetricKey =
  | 'iaq'
  | 'temperature'
  | 'humidity'
  | 'pressure'
  | 'co2'
  | 'voc';

export interface MetricConfig {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
  yAxis: 'y' | 'y2' | 'y3' | 'y4' | 'y5';
  min: number;
  max: number;
  outdoorMin?: number;
  outdoorMax?: number;
  decimals: number;
  visibleByDefault: boolean;
}

export const METRICS: MetricConfig[] = [
  {
    key: 'temperature',
    label: 'Temperature',
    unit: '°C',
    color: '#ff7f0e',
    yAxis: 'y',
    min: 15,
    max: 30,
    outdoorMin: -20,
    outdoorMax: 40,
    decimals: 1,
    visibleByDefault: true,
  },
  {
    key: 'humidity',
    label: 'Humidity',
    unit: '%',
    color: '#1f77b4',
    yAxis: 'y',
    min: 0,
    max: 100,
    decimals: 1,
    visibleByDefault: true,
  },
  {
    key: 'iaq',
    label: 'IAQ',
    unit: '',
    color: '#2ca02c',
    yAxis: 'y2',
    min: 0,
    max: 500,
    decimals: 0,
    visibleByDefault: true,
  },
  {
    key: 'co2',
    label: 'eCO₂',
    unit: 'ppm',
    color: '#d62728',
    yAxis: 'y3',
    min: 400,
    max: 2000,
    decimals: 0,
    visibleByDefault: true,
  },
  {
    key: 'voc',
    label: 'VOC',
    unit: 'ppm',
    color: '#9467bd',
    yAxis: 'y4',
    min: 0,
    max: 2,
    decimals: 2,
    visibleByDefault: true,
  },
  {
    key: 'pressure',
    label: 'Pressure',
    unit: 'hPa',
    color: '#8c564b',
    yAxis: 'y5',
    min: 950,
    max: 1050,
    decimals: 0,
    visibleByDefault: false,
  },
];

export const IAQ_BANDS: {
  min: number;
  max: number;
  label: string;
  color: string;
}[] = [
  { min: 0, max: 50, label: 'Excellent', color: '#145a32' },
  { min: 51, max: 100, label: 'Good', color: '#2ecc71' },
  { min: 101, max: 150, label: 'Light', color: '#f1c40f' },
  { min: 151, max: 200, label: 'Moderate', color: '#f39c12' },
  { min: 201, max: 250, label: 'Heavy', color: '#e67e22' },
  { min: 251, max: 350, label: 'Severe', color: '#e74c3c' },
  { min: 351, max: 500, label: 'Extreme', color: '#9b59b6' },
];

export function getIaqBand(iaq: number): {
  label: string;
  color: string;
} {
  const band = IAQ_BANDS.find((b) => iaq <= b.max);
  return band ?? IAQ_BANDS[IAQ_BANDS.length - 1];
}

export function getAccuracyLabel(
  accuracy: number,
): { label: string; color: string } {
  switch (accuracy) {
    case 0:
      return { label: 'Stabilizing', color: '#95a5a6' };
    case 1:
      return { label: 'Low', color: '#f39c12' };
    case 2:
      return { label: 'Medium', color: '#3498db' };
    case 3:
      return { label: 'Calibrated', color: '#2ecc71' };
    default:
      return { label: 'Unknown', color: '#95a5a6' };
  }
}

export function formatMetricValue(
  value: number | undefined,
  metric: MetricConfig,
): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(metric.decimals)}${metric.unit ? ' ' + metric.unit : ''}`;
}
