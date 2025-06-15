import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  SupabaseService,
  Room,
  Sensor,
  AirQualityData,
} from '../../services/supabase.service';
import { Chart, ChartConfiguration } from 'chart.js';
import { registerables } from 'chart.js';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';

Chart.register(...registerables);

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
    MatProgressSpinnerModule,
  ],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  rooms: Room[] = [];
  sensors: Sensor[] = [];
  selectedRoom: Room | null = null;
  selectedSensor: Sensor | null = null;
  latestData: AirQualityData | null = null;
  private chart: Chart | null = null;
  private updateSubscription: Subscription | null = null;

  async ngOnInit() {
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
    this.chart?.destroy();
    this.chart = null;

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

  async onSensorChange() {
    if (!this.selectedSensor) return;

    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
      this.updateSubscription = null;
    }

    try {
      const data = await this.supabaseService.getAirQualityData(
        this.selectedSensor.id,
      );

      if (data.length > 0) {
        this.latestData = data[0];
        this.updateChart(data);
      }

      this.updateSubscription = this.supabaseService
        .subscribeToAirQualityUpdates(this.selectedSensor.id)
        .subscribe((newData) => {
          console.log('Received new air quality data:', newData);
          this.latestData = newData;

          if (this.chart) {
            const chartData = this.chart.data;
            const labels = chartData.labels as string[];
            const datasets = chartData.datasets;

            labels.push(
              new Date(newData.timestamp_received).toLocaleTimeString(),
            );
            datasets.forEach((dataset) => {
              const data = dataset.data as number[];
              switch (dataset.label) {
                case 'Temperature (°C)':
                  data.push(newData.temperature);
                  break;
                case 'Humidity (%)':
                  data.push(newData.humidity);
                  break;
                default:
                  break;
              }
            });

            if (labels.length > 20) {
              labels.shift();
              datasets.forEach((dataset) => {
                (dataset.data as number[]).shift();
              });
            }

            this.chart.update();
          }
        });
    } catch (error) {
      console.error('Error loading sensor data:', error);
    }
  }

  private updateChart(data: AirQualityData[]) {
    const ctx = document.querySelector('canvas')?.getContext('2d');
    if (!ctx) return;

    const timestamps = data
      .map((d) => new Date(d.timestamp_received).toLocaleTimeString())
      .reverse();
    const temperatures = data.map((d) => d.temperature).reverse();
    const humidities = data.map((d) => d.humidity).reverse();

    if (this.chart) {
      this.chart.destroy();
    }

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: timestamps,
        datasets: [
          {
            label: 'Temperature (°C)',
            data: temperatures,
            borderColor: 'rgb(255, 99, 132)',
            tension: 0.1,
          },
          {
            label: 'Humidity (%)',
            data: humidities,
            borderColor: 'rgb(54, 162, 235)',
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false,
          },
        },
      },
    };

    this.chart = new Chart(ctx, config);
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
