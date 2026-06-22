import { Injectable, InjectionToken, inject } from '@angular/core';
import { AirQualityData } from './supabase.service';
import { getIaqBand } from '../models/metric.model';

export const DEFAULT_IAQ_ALERT_THRESHOLD = 151;
export const DEFAULT_CONSECUTIVE_READINGS = 2;
export const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
export const DEFAULT_MIN_ACCURACY = 1;

export interface IaqAlertConfig {
  threshold?: number;
  requiredConsecutiveReadings?: number;
  cooldownMs?: number;
  minAccuracy?: number;
}

export const IAQ_ALERT_CONFIG = new InjectionToken<IaqAlertConfig>(
  'iaq-alert-config',
  {
    factory: () => ({}),
  },
);

export interface IaqAlertResult {
  shouldAlert: boolean;
  sensorId: string;
  iaq: number;
  band: string;
  roomName?: string;
  sensorName?: string;
}

interface SensorAlertState {
  consecutiveBadReadings: number;
  lastAlertTimestamp: number;
  isArmed: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class IaqAlertService {
  private readonly config = inject(IAQ_ALERT_CONFIG);
  private readonly threshold =
    this.config.threshold ?? DEFAULT_IAQ_ALERT_THRESHOLD;
  private readonly requiredConsecutiveReadings =
    this.config.requiredConsecutiveReadings ?? DEFAULT_CONSECUTIVE_READINGS;
  private readonly cooldownMs =
    this.config.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  private readonly minAccuracy =
    this.config.minAccuracy ?? DEFAULT_MIN_ACCURACY;
  private readonly sensorStates = new Map<string, SensorAlertState>();

  evaluate(
    data: AirQualityData,
    roomName?: string,
    sensorName?: string,
  ): IaqAlertResult {
    const state = this.getOrCreateState(data.sensor_id);
    const isBad = this.isBadReading(data);

    if (isBad) {
      state.consecutiveBadReadings += 1;
    } else {
      state.consecutiveBadReadings = 0;
      state.isArmed = true;
    }

    const now = Date.now();
    const cooldownElapsed = now - state.lastAlertTimestamp >= this.cooldownMs;
    const enoughConsecutive =
      state.consecutiveBadReadings >= this.requiredConsecutiveReadings;

    const shouldAlert =
      isBad && state.isArmed && enoughConsecutive && cooldownElapsed;

    if (shouldAlert) {
      state.lastAlertTimestamp = now;
      state.isArmed = false;
    }

    return {
      shouldAlert,
      sensorId: data.sensor_id,
      iaq: data.iaq,
      band: getIaqBand(data.iaq).label,
      roomName,
      sensorName,
    };
  }

  reset(sensorId?: string): void {
    if (sensorId) {
      this.sensorStates.delete(sensorId);
    } else {
      this.sensorStates.clear();
    }
  }

  private getOrCreateState(sensorId: string): SensorAlertState {
    let state = this.sensorStates.get(sensorId);
    if (!state) {
      state = {
        consecutiveBadReadings: 0,
        lastAlertTimestamp: 0,
        isArmed: true,
      };
      this.sensorStates.set(sensorId, state);
    }
    return state;
  }

  private isBadReading(data: AirQualityData): boolean {
    return data.accuracy >= this.minAccuracy && data.iaq >= this.threshold;
  }
}
