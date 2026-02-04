// src/app/services/keep-alive.service.ts
import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { interval, Observable, from, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class KeepAliveService {
  private apiUrl = `${environment.apiUrl}/keep-alive`;
  private pingSubscription: Subscription | null = null;
  private readonly PING_INTERVAL = 9 * 60 * 1000; // 9 minutes
  private isRunning = false;
  private lastPingTime: Date | null = null;
  private errorCount = 0;

  constructor(
    private http: HttpClient,
    private ngZone: NgZone
  ) {
    console.log('🧠 Silent Keep-Alive Service Initialized');
  }

  /**
   * Start silent 24/7 keep-alive
   */
  start(): void {
    if (this.isRunning) return;
    
    console.log('🚀 Starting silent 24/7 keep-alive service...');
    console.log('📡 Will ping backend every 9 minutes (invisible to user)');
    console.log('🎯 Target: Prevent backend from sleeping on free hosting');
    
    this.isRunning = true;
    
    // Run outside Angular zone to avoid any UI impact
    this.ngZone.runOutsideAngular(() => {
      // Immediate ping on start
      this.silentPing();
      
      // Regular interval pings
      this.pingSubscription = interval(this.PING_INTERVAL).subscribe(() => {
        this.silentPing();
      });
      
      // Additional safety: ping at specific minutes
      interval(60 * 1000).subscribe(() => {
        const now = new Date();
        const minutes = now.getMinutes();
        
        // Ping at minutes 5, 15, 25, 35, 45, 55 as backup
        if (minutes % 10 === 5) {
          this.silentPing();
        }
      });
    });
    
    // Also ping when tab becomes visible (but silently)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
    
    console.log('✅ Silent keep-alive service started (no UI changes)');
  }

  /**
   * Stop the service
   */
  stop(): void {
    if (this.pingSubscription) {
      this.pingSubscription.unsubscribe();
      this.pingSubscription = null;
    }
    this.isRunning = false;
    
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
    
    console.log('🛑 Silent keep-alive service stopped');
  }

  /**
   * Silent ping - no UI feedback, no errors in console
   */
  private silentPing(): void {
    const timestamp = new Date().toISOString();
    
    // Try multiple endpoints silently
    const endpoints = ['/ping', '', '/health'];
    
    endpoints.forEach(endpoint => {
      this.http.get(`${this.apiUrl}${endpoint}`, {
        headers: { 'X-Silent-Ping': 'true' }
      }).pipe(
        catchError(() => from([])) // Swallow errors completely
      ).subscribe({
        next: () => {
          this.lastPingTime = new Date();
          this.errorCount = 0;
        },
        error: () => {
          // Completely silent - no console logs
        }
      });
    });
  }

  /**
   * Handle tab visibility changes (silent)
   */
  private handleVisibilityChange(): void {
    if (!document.hidden) {
      // Tab became visible, ping silently
      this.silentPing();
    }
  }

  /**
   * Manual wake-up if needed (also silent)
   */
  wakeUpSilently(): Observable<any> {
    return this.http.get(`${this.apiUrl}/wakeup`).pipe(
      catchError(() => from([])) // Swallow errors
    );
  }

  /**
   * Get service status (for debugging only)
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      lastPing: this.lastPingTime?.toLocaleTimeString() || 'Never',
      errorCount: this.errorCount
    };
  }
}