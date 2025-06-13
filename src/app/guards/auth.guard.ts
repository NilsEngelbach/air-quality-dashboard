import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take, tap, filter } from 'rxjs/operators';
import { SupabaseService } from '../services/supabase.service';
import { User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.supabaseService.currentUser$.pipe(
      // Wait until we have a definitive answer (not undefined)
      filter((user): user is User | null => user !== undefined),
      take(1),
      tap(user => {
        if (!user) {
          console.log('No authenticated user found, redirecting to login...');
          this.router.navigate(['/login']);
        } else {
          console.log('User authenticated:', user.email);
        }
      }),
      map(user => !!user)
    );
  }
} 