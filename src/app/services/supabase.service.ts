import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, AuthError } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable, from, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export interface Room {
  id: string;
  name: string;
  created_at: string;
}

export interface Sensor {
  id: string;
  name: string;
  room_id: string;
  created_at: string;
}

export interface AirQualityData {
  id: string;
  sensor_id: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  pressure: number;
  voc: number;
  co2: number;
  iaq: number;
  accuracy: number;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUser = new BehaviorSubject<any>(undefined);
  public currentUser$ = this.currentUser.asObservable();
  private authInitialized = false;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'sb-auth-token',
        storage: {
          getItem: (key) => {
            try {
              const value = localStorage.getItem(key);
              if (!value) return null;
              
              // Parse the stored value to check if it's expired
              const parsed = JSON.parse(value);
              if (parsed.expires_at && parsed.expires_at * 1000 < Date.now()) {
                localStorage.removeItem(key);
                return null;
              }
              return value;
            } catch (error) {
              console.warn('Error accessing localStorage:', error);
              return null;
            }
          },
          setItem: (key, value) => {
            try {
              localStorage.setItem(key, value);
            } catch (error) {
              console.warn('Error setting localStorage:', error);
            }
          },
          removeItem: (key) => {
            try {
              localStorage.removeItem(key);
            } catch (error) {
              console.warn('Error removing from localStorage:', error);
            }
          }
        }
      }
    });

    // Initialize auth state immediately
    this.initializeAuth();
  }

  private async initializeAuth() {
    if (this.authInitialized) return;

    try {
      // First try to get the session from storage
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (error) throw error;
      
      if (session) {
        console.log('Found existing session for:', session.user.email);
        this.currentUser.next(session.user);
      } else {
        console.log('No existing session found');
        this.currentUser.next(null);
      }
      
      // Set up auth state change listener
      this.supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        this.currentUser.next(session?.user ?? null);
      });

      this.authInitialized = true;
    } catch (error) {
      console.error('Error initializing auth:', error);
      this.currentUser.next(null);
      this.authInitialized = true;
    }
  }

  // Auth methods
  async signIn(email: string, password: string): Promise<any> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Data methods
  async getRooms(): Promise<Room[]> {
    try {
      const { data, error } = await this.supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Room[];
    } catch (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }
  }

  async getSensors(roomId: string): Promise<Sensor[]> {
    try {
      const { data, error } = await this.supabase
        .from('sensors')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Sensor[];
    } catch (error) {
      console.error('Error fetching sensors:', error);
      throw error;
    }
  }

  async getAirQualityData(sensorId: string, limit: number = 100): Promise<AirQualityData[]> {
    try {
      const { data, error } = await this.supabase
        .from('air_quality_data')
        .select('*')
        .eq('sensor_id', sensorId)
        .order('timestamp', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as AirQualityData[];
    } catch (error) {
      console.error('Error fetching air quality data:', error);
      throw error;
    }
  }

  getCurrentUser(): Observable<any> {
    if (!this.authInitialized) {
      this.initializeAuth();
    }
    return this.currentUser.asObservable();
  }
} 