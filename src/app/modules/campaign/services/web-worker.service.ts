// src/app/services/web-worker.service.ts
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebWorkerService {
  private worker: Worker | null = null;
  private isSupported = typeof Worker !== 'undefined';

  constructor() {
    console.log('🔧 WebWorker Service initialized');
    console.log('📱 Worker support:', this.isSupported);
  }

  /**
   * Create and initialize the keep-alive worker
   */
  createKeepAliveWorker(): Worker | null {
    if (!this.isSupported) {
      console.warn('⚠️ Web Workers not supported in this browser');
      return null;
    }

    try {
      // Create inline worker code
      const workerCode = `
        // Keep-alive Web Worker
        // Runs independently of Angular app
        const PING_INTERVAL = 9 * 60 * 1000; // 9 minutes
        const AGGRESSIVE_INTERVAL = 60 * 1000; // 1 minute for emergencies
        let backendUrl = '${environment.apiUrl}';
        let pingTimer = null;
        let aggressiveTimer = null;
        let errorCount = 0;
        const MAX_ERRORS = 5;

        console.log('[KeepAlive Worker] 🚀 Starting 24/7 background service');
        console.log('[KeepAlive Worker] 📡 Backend URL:', backendUrl);
        console.log('[KeepAlive Worker] ⏰ Ping interval:', PING_INTERVAL/1000, 'seconds');

        // Listen for messages from main thread
        self.addEventListener('message', (event) => {
          const { type, data } = event.data;
          
          console.log(\`[KeepAlive Worker] 📨 Received message: \${type}\`);
          
          switch (type) {
            case 'START':
              startPinging(data?.interval || PING_INTERVAL);
              break;
              
            case 'STOP':
              stopPinging();
              break;
              
            case 'PING_NOW':
              pingBackend();
              break;
              
            case 'UPDATE_URL':
              backendUrl = data.url;
              console.log(\`[KeepAlive Worker] 🔄 Updated backend URL to: \${backendUrl}\`);
              break;
              
            case 'AGGRESSIVE_MODE':
              startAggressiveMode();
              break;
              
            case 'NORMAL_MODE':
              stopAggressiveMode();
              break;
          }
        });

        function startPinging(intervalMs) {
          stopPinging();
          console.log(\`[KeepAlive Worker] ⏰ Starting pinging every \${intervalMs/1000} seconds\`);
          
          // Immediate ping
          pingBackend();
          
          // Regular interval pings
          pingTimer = setInterval(() => {
            console.log(\`[KeepAlive Worker] ⏰ Scheduled ping triggered\`);
            pingBackend();
          }, intervalMs);
          
          self.postMessage({ 
            type: 'STARTED', 
            interval: intervalMs,
            timestamp: new Date().toISOString()
          });
        }

        function stopPinging() {
          if (pingTimer) {
            clearInterval(pingTimer);
            pingTimer = null;
            console.log('[KeepAlive Worker] 🛑 Stopped regular pinging');
          }
          stopAggressiveMode();
        }

        function startAggressiveMode() {
          stopAggressiveMode();
          console.log('[KeepAlive Worker] 🚨 Starting aggressive mode (1 min intervals)');
          
          aggressiveTimer = setInterval(() => {
            console.log('[KeepAlive Worker] 🚨 Aggressive ping triggered');
            pingBackend();
          }, AGGRESSIVE_INTERVAL);
          
          // Immediate ping
          pingBackend();
        }

        function stopAggressiveMode() {
          if (aggressiveTimer) {
            clearInterval(aggressiveTimer);
            aggressiveTimer = null;
            console.log('[KeepAlive Worker] ✅ Stopped aggressive mode');
          }
        }

        async function pingBackend() {
          const timestamp = new Date().toISOString();
          const endpoints = [
            '/keep-alive/ping',
            '/keep-alive',
            '/keep-alive/health',
            '/keep-alive/status'
          ];
          
          console.log(\`[KeepAlive Worker] 📡 Pinging backend at \${timestamp}\`);
          
          for (const endpoint of endpoints) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
              
              const response = await fetch(\`\${backendUrl}\${endpoint}\`, {
                method: 'GET',
                headers: { 
                  'Content-Type': 'application/json',
                  'X-Keep-Alive': '24/7-Worker'
                },
                cache: 'no-cache',
                mode: 'cors',
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              
              if (response.ok) {
                const data = await response.json();
                errorCount = 0; // Reset error count
                
                console.log(\`[KeepAlive Worker] ✅ Ping successful: \${endpoint}\`);
                
                self.postMessage({
                  type: 'PING_SUCCESS',
                  endpoint,
                  timestamp,
                  status: response.status,
                  data: data,
                  errorCount: errorCount
                });
                
                // If we were in aggressive mode and got success, return to normal
                if (aggressiveTimer && errorCount === 0) {
                  stopAggressiveMode();
                  startPinging(PING_INTERVAL);
                }
                
                return; // Success, stop trying endpoints
              }
            } catch (error) {
              console.warn(\`[KeepAlive Worker] ❌ Ping failed for \${endpoint}:\`, error.name);
            }
          }
          
          // All endpoints failed
          errorCount++;
          console.warn(\`[KeepAlive Worker] ❌ All endpoints failed (attempt \${errorCount})\`);
          
          self.postMessage({
            type: 'PING_FAILED',
            timestamp,
            errorCount,
            message: 'All endpoints failed',
            maxErrors: MAX_ERRORS
          });
          
          // If too many errors, switch to aggressive mode
          if (errorCount >= MAX_ERRORS && !aggressiveTimer) {
            console.log('[KeepAlive Worker] 🚨 Too many errors, switching to aggressive mode');
            startAggressiveMode();
          }
        }

        // Auto-start when worker loads
        console.log('[KeepAlive Worker] ✅ Worker loaded successfully');
        self.postMessage({ type: 'WORKER_LOADED', timestamp: new Date().toISOString() });
      `;

      // Create worker from blob
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);

      // Setup message handler
      this.worker.onmessage = (event) => {
        this.handleWorkerMessage(event.data);
      };

      // Setup error handler
      this.worker.onerror = (error) => {
        console.error('[Worker Error]', error);
        this.handleWorkerMessage({
          type: 'WORKER_ERROR',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      };

      console.log('✅ Web Worker created successfully');
      return this.worker;

    } catch (error) {
      console.error('❌ Failed to create web worker:', error);
      return null;
    }
  }

  /**
   * Start the worker
   */
  startWorker(intervalMinutes: number = 9): void {
    if (this.worker) {
      console.log(`🚀 Starting worker with ${intervalMinutes} minute intervals`);
      this.worker.postMessage({ 
        type: 'START', 
        data: { interval: intervalMinutes * 60 * 1000 }
      });
    }
  }

  /**
   * Stop the worker
   */
  stopWorker(): void {
    if (this.worker) {
      console.log('🛑 Stopping worker');
      this.worker.postMessage({ type: 'STOP' });
    }
  }

  /**
   * Force immediate ping
   */
  pingNow(): void {
    if (this.worker) {
      console.log('🔔 Manual ping requested');
      this.worker.postMessage({ type: 'PING_NOW' });
    }
  }

  /**
   * Update backend URL
   */
  updateBackendUrl(url: string): void {
    if (this.worker) {
      console.log(`🔄 Updating backend URL to: ${url}`);
      this.worker.postMessage({ type: 'UPDATE_URL', data: { url } });
    }
  }

  /**
   * Enter aggressive mode
   */
  startAggressiveMode(): void {
    if (this.worker) {
      console.log('🚨 Entering aggressive mode');
      this.worker.postMessage({ type: 'AGGRESSIVE_MODE' });
    }
  }

  /**
   * Exit aggressive mode
   */
  stopAggressiveMode(): void {
    if (this.worker) {
      console.log('✅ Exiting aggressive mode');
      this.worker.postMessage({ type: 'NORMAL_MODE' });
    }
  }

  /**
   * Terminate worker
   */
  terminate(): void {
    if (this.worker) {
      console.log('💀 Terminating worker');
      this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Handle messages from worker
   */
  private handleWorkerMessage(message: any): void {
    const timestamp = new Date().toLocaleTimeString();
    
    switch (message.type) {
      case 'WORKER_LOADED':
        console.log(`✅ ${timestamp} - Worker loaded successfully`);
        break;
        
      case 'STARTED':
        console.log(`✅ ${timestamp} - Worker started: ${message.interval/60000}min intervals`);
        break;
        
      case 'PING_SUCCESS':
        console.log(`✅ ${timestamp} - Ping success: ${message.endpoint}`);
        // Store last successful ping time
        localStorage.setItem('last_successful_ping', new Date().toISOString());
        localStorage.setItem('last_ping_endpoint', message.endpoint);
        break;
        
      case 'PING_FAILED':
        console.warn(`❌ ${timestamp} - Ping failed (attempt ${message.errorCount}/${message.maxErrors})`);
        localStorage.setItem('last_failed_ping', new Date().toISOString());
        localStorage.setItem('error_count', message.errorCount.toString());
        break;
        
      case 'WORKER_ERROR':
        console.error(`💀 ${timestamp} - Worker error:`, message.error);
        break;
        
      default:
        console.log(`📨 ${timestamp} - Unknown message:`, message.type);
    }
  }
}