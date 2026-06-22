import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  SupabaseService,
  Room,
  Sensor,
  AirQualityData,
} from '../../services/supabase.service';
import { IaqAlertService } from '../../services/iaq-alert.service';
import {
  NotificationService,
  NotificationPayload,
} from '../../services/notification.service';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import {
  CreateNameDialogComponent,
  CreateNameDialogData,
} from '../create-name-dialog/create-name-dialog.component';
import { IaqGaugeComponent } from '../iaq-gauge/iaq-gauge.component';
import { HistoryChartComponent } from '../history-chart/history-chart.component';
import {
  formatMetricValue,
  METRICS,
  MetricConfig,
  MetricKey,
} from '../../models/metric.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatListModule,
    MatCardModule,
    MatSelectModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatTooltipModule,
    IaqGaugeComponent,
    HistoryChartComponent,
  ],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private iaqAlertService = inject(IaqAlertService);
  private notificationService = inject(NotificationService);

  rooms: Room[] = [];
  sensors: Sensor[] = [];
  selectedRoom: Room | null = null;
  selectedSensor: Sensor | null = null;
  latestData: AirQualityData | null = null;
  chartData: AirQualityData[] = [];
  rangeHours = 24;

  readonly metrics: MetricConfig[] = METRICS;
  readonly formatMetricValue = formatMetricValue;

  notificationsEnabled = false;
  notificationsUnsupported = false;

  private updateSubscription: Subscription | null = null;

  async ngOnInit() {
    this.notificationsEnabled = this.notificationService.areNotificationsEnabled();
    this.notificationsUnsupported = !this.notificationService.isBrowserApiSupported();
    await this.loadRooms();
  }

  async loadRooms() {
    try {
      this.rooms = await this.supabaseService.getRooms();
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  }

  async selectRoom(room: Room) {
    this.selectedRoom = room;
    this.selectedSensor = null;
    this.latestData = null;
    this.chartData = [];

    try {
      this.sensors = await this.supabaseService.getSensors(room.id);
      if (this.sensors.length > 0) {
        this.selectedSensor = this.sensors[0];
        await this.onSensorChange();
      }
    } catch (error) {
      console.error('Error loading sensors:', error);
    }
  }

  openCreateRoomDialog(): void {
    const dialogRef = this.dialog.open(CreateNameDialogComponent, {
      width: '400px',
      data: {
        title: 'Create Room',
        label: 'Room name',
      } as CreateNameDialogData,
    });

    dialogRef.afterClosed().subscribe((name: string | undefined) => {
      if (name) {
        this.createRoom(name);
      }
    });
  }

  async createRoom(name: string): Promise<void> {
    try {
      const room = await this.supabaseService.createRoom(name);
      this.rooms = [room, ...this.rooms];
      await this.selectRoom(room);
    } catch (error) {
      console.error('Error creating room:', error);
    }
  }

  openCreateSensorDialog(): void {
    if (!this.selectedRoom) {
      return;
    }

    const dialogRef = this.dialog.open(CreateNameDialogComponent, {
      width: '400px',
      data: {
        title: 'Create Air-Checker',
        label: 'Sensor name',
      } as CreateNameDialogData,
    });

    dialogRef.afterClosed().subscribe((name: string | undefined) => {
      if (name) {
        this.createSensor(name);
      }
    });
  }

  async createSensor(name: string): Promise<void> {
    if (!this.selectedRoom) {
      return;
    }

    try {
      const sensor = await this.supabaseService.createSensor(
        name,
        this.selectedRoom.id,
      );
      this.sensors = [sensor, ...this.sensors];
      this.selectedSensor = sensor;
      await this.onSensorChange();
    } catch (error) {
      console.error('Error creating sensor:', error);
    }
  }

  async copySensorId(): Promise<void> {
    if (!this.selectedSensor) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.selectedSensor.id);
    } catch (error) {
      console.error('Error copying sensor id:', error);
    }
  }

  async onRangeChange(hours: number) {
    this.rangeHours = hours;
    if (this.selectedSensor) {
      await this.loadSensorData();
    }
  }

  async onSensorChange() {
    if (!this.selectedSensor) {
      return;
    }

    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
      this.updateSubscription = null;
    }

    try {
      await this.loadSensorData();
      this.iaqAlertService.reset(this.selectedSensor.id);

      this.updateSubscription = this.supabaseService
        .subscribeToAirQualityUpdates(this.selectedSensor.id)
        .subscribe((newData) => {
          console.log('Received new air quality data:', newData);
          this.latestData = newData;
          this.appendRealtimeData(newData);
          this.handleIaqAlert(newData);
        });
    } catch (error) {
      console.error('Error loading sensor data:', error);
    }
  }

  private async loadSensorData() {
    if (!this.selectedSensor) {
      return;
    }

    try {
      const data = await this.supabaseService.getAirQualityData(
        this.selectedSensor.id,
        this.rangeHours,
      );

      this.chartData = data;
      if (data.length > 0) {
        this.latestData = data[data.length - 1];
      }
    } catch (error) {
      console.error('Error loading sensor data:', error);
    }
  }

  private appendRealtimeData(newData: AirQualityData) {
    const cutoff = new Date(
      Date.now() - this.rangeHours * 60 * 60 * 1000,
    );
    const filtered = this.chartData.filter(
      (d) => new Date(d.timestamp_received) >= cutoff,
    );
    this.chartData = [...filtered, newData];
  }

  private handleIaqAlert(newData: AirQualityData): void {
    const result = this.iaqAlertService.evaluate(
      newData,
      this.selectedRoom?.name,
      this.selectedSensor?.name,
    );

    if (!result.shouldAlert) {
      return;
    }

    const location = [result.roomName, result.sensorName]
      .filter(Boolean)
      .join(' – ');

    const payload: NotificationPayload = {
      title: 'Air quality alert',
      body: location
        ? `IAQ is ${result.band} (${result.iaq}) in ${location}.`
        : `IAQ is ${result.band} (${result.iaq}).`,
      tag: `iaq-alert-${result.sensorId}`,
    };

    this.notificationService.show(payload);
  }

  getMetricValue(data: AirQualityData | null, key: MetricKey): number | undefined {
    return data?.[key];
  }

  async toggleNotifications(enabled: boolean): Promise<void> {
    if (enabled) {
      const granted = await this.notificationService.enableNotifications();
      this.notificationsEnabled = granted;
    } else {
      this.notificationService.disableNotifications();
      this.notificationsEnabled = false;
    }
  }

  async logout() {
    try {
      await this.supabaseService.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  ngOnDestroy() {
    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
    }
    this.supabaseService.unsubscribeFromAirQualityUpdates();
  }
}
