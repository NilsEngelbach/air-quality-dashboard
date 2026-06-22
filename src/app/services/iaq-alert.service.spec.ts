import { TestBed } from '@angular/core/testing';
import {
  IaqAlertService,
  IAQ_ALERT_CONFIG,
  DEFAULT_IAQ_ALERT_THRESHOLD,
} from './iaq-alert.service';
import { AirQualityData } from './supabase.service';

function createReading(
  iaq: number,
  accuracy = 3,
  sensorId = 'sensor-1',
): AirQualityData {
  return {
    id: 'reading-1',
    sensor_id: sensorId,
    timestamp_received: new Date().toISOString(),
    temperature: 20,
    humidity: 50,
    pressure: 1013,
    voc: 0.5,
    co2: 500,
    iaq,
    accuracy,
  };
}

describe('IaqAlertService', () => {
  let service: IaqAlertService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        IaqAlertService,
        { provide: IAQ_ALERT_CONFIG, useValue: {} },
      ],
    });
    service = TestBed.inject(IaqAlertService);
  });

  afterEach(() => {
    service.reset();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not alert on a single bad reading', () => {
    const reading = createReading(DEFAULT_IAQ_ALERT_THRESHOLD);
    const result = service.evaluate(reading);

    expect(result.shouldAlert).toBe(false);
    expect(result.iaq).toBe(reading.iaq);
    expect(result.band).toBe('Moderate');
  });

  it('should alert after two consecutive bad readings', () => {
    const reading = createReading(DEFAULT_IAQ_ALERT_THRESHOLD);

    service.evaluate(reading);
    const result = service.evaluate(reading);

    expect(result.shouldAlert).toBe(true);
  });

  it('should not alert when the reading is good', () => {
    const reading = createReading(50);

    const result = service.evaluate(reading);

    expect(result.shouldAlert).toBe(false);
  });

  it('should reset consecutive count after a good reading', () => {
    const badReading = createReading(DEFAULT_IAQ_ALERT_THRESHOLD);
    const goodReading = createReading(50);

    service.evaluate(badReading);
    service.evaluate(goodReading);
    const result = service.evaluate(badReading);

    expect(result.shouldAlert).toBe(false);
  });

  it('should not alert for stabilizing readings (accuracy 0)', () => {
    const reading = createReading(DEFAULT_IAQ_ALERT_THRESHOLD, 0);

    service.evaluate(reading);
    const result = service.evaluate(reading);

    expect(result.shouldAlert).toBe(false);
  });

  it('should re-arm after air quality returns to good', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        IaqAlertService,
        { provide: IAQ_ALERT_CONFIG, useValue: { cooldownMs: 0 } },
      ],
    });
    const testService = TestBed.inject(IaqAlertService);

    const badReading = createReading(DEFAULT_IAQ_ALERT_THRESHOLD);
    const goodReading = createReading(50);

    testService.evaluate(badReading);
    const firstAlert = testService.evaluate(badReading);
    expect(firstAlert.shouldAlert).toBe(true);

    testService.evaluate(goodReading);
    testService.evaluate(badReading);
    const secondAlert = testService.evaluate(badReading);

    expect(secondAlert.shouldAlert).toBe(true);

    testService.reset();
  });

  it('should apply cooldown between alerts', () => {
    const reading = createReading(DEFAULT_IAQ_ALERT_THRESHOLD);

    service.evaluate(reading);
    const firstAlert = service.evaluate(reading);
    expect(firstAlert.shouldAlert).toBe(true);

    const secondAlert = service.evaluate(reading);
    expect(secondAlert.shouldAlert).toBe(false);
  });

  it('should track different sensors independently', () => {
    const badReadingA = createReading(
      DEFAULT_IAQ_ALERT_THRESHOLD,
      3,
      'sensor-a',
    );
    const badReadingB = createReading(
      DEFAULT_IAQ_ALERT_THRESHOLD,
      3,
      'sensor-b',
    );

    service.evaluate(badReadingA);
    service.evaluate(badReadingB);
    const resultA = service.evaluate(badReadingA);
    const resultB = service.evaluate(badReadingB);

    expect(resultA.shouldAlert).toBe(true);
    expect(resultB.shouldAlert).toBe(true);
  });

  it('should include room and sensor names in the result', () => {
    const reading = createReading(DEFAULT_IAQ_ALERT_THRESHOLD);

    service.evaluate(reading);
    const result = service.evaluate(reading, 'Living room', 'Sensor A');

    expect(result.shouldAlert).toBe(true);
    expect(result.roomName).toBe('Living room');
    expect(result.sensorName).toBe('Sensor A');
  });
});
