import { Component } from '@angular/core';
import { KeepAliveService } from './modules/campaign/services/keep-alive.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
 constructor(private keepAliveService: KeepAliveService) {
    // Optional: One-time console log to confirm service is loaded
    console.log('🎮 Campaign Tracker loaded with 24/7 keep-alive (silent)');
  }

  ngOnInit(): void {
    // Start silent keep-alive service
    this.keepAliveService.start();
    
    // Optional: Log once on startup (can be removed)
    console.log('✅ Silent 24/7 keep-alive service started');
    console.log('📡 Backend will be kept awake automatically');
    console.log('🎯 No UI changes - works completely in background');
  }

  ngOnDestroy(): void {
    // Clean up
    this.keepAliveService.stop();
  }}