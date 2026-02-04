import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface DateFilter {
  type: 'all' | 'month' | 'custom';
  month?: number;
  year?: number;
  startDate?: string;
  endDate?: string;
}

export interface CampaignStats {
  // Balance stats
  startBalance: number;
  endBalance: number;
  netChange: number;
  percentageChange: number;
  
  // Transaction stats
  totalDeposits: number;
  totalWithdrawals: number;
  netTransactions: number;
  
  // Bet stats
  totalBets: number;
  winningBets: number;
  losingBets: number;
  pendingBets: number;
  totalStake: number;
  totalReturn: number;
  totalProfitLoss: number;
  roi: number;
  winRate: number;
  
  // Performance metrics
  averageOdds: number;
  averageStake: number;
  biggestWin: number;
  biggestLoss: number;
  bestBet: any;
  worstBet: any;
  
  // Date range
  fromDate?: Date;
  toDate?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CampaignDateFilterService {
  private currentFilter = new BehaviorSubject<DateFilter>({ type: 'all' });
  private currentStats = new BehaviorSubject<CampaignStats | null>(null);
  
  currentFilter$ = this.currentFilter.asObservable();
  currentStats$ = this.currentStats.asObservable();
  
  constructor() {
    // Set default filter to current month
    const today = new Date();
    this.setFilter({
      type: 'month',
      month: today.getMonth() + 1,
      year: today.getFullYear()
    });
  }
  
  setFilter(filter: DateFilter): void {
    this.currentFilter.next(filter);
  }
  
  updateStats(stats: CampaignStats): void {
    this.currentStats.next(stats);
  }
  
  getCurrentFilter(): DateFilter {
    return this.currentFilter.value;
  }
  
  getFilterDescription(): string {
    const filter = this.currentFilter.value;
    
    switch (filter.type) {
      case 'all':
        return 'All Time';
      case 'month':
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
        return `${monthNames[(filter.month || 1) - 1]} ${filter.year}`;
      case 'custom':
        if (filter.startDate && filter.endDate) {
          const start = new Date(filter.startDate);
          const end = new Date(filter.endDate);
          return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
        }
        return 'Custom Range';
      default:
        return '';
    }
  }
  
  // Helper methods for date calculations
  getDateRange(): { start: Date, end: Date } {
    const filter = this.currentFilter.value;
    let start: Date;
    let end: Date = new Date();
    
    switch (filter.type) {
      case 'all':
        start = new Date(2000, 0, 1); // Very old date
        break;
      case 'month':
        if (filter.month && filter.year) {
          start = new Date(filter.year, filter.month - 1, 1);
          end = new Date(filter.year, filter.month, 0); // Last day of month
        } else {
          start = new Date(end.getFullYear(), end.getMonth(), 1);
        }
        break;
      case 'custom':
        if (filter.startDate) {
          start = new Date(filter.startDate);
        } else {
          start = new Date(end.getFullYear(), end.getMonth(), 1);
        }
        if (filter.endDate) {
          end = new Date(filter.endDate);
        }
        break;
      default:
        start = new Date(end.getFullYear(), end.getMonth(), 1);
    }
    
    // Set to start/end of day
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  }
  
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  getMonths(): Array<{value: number, label: string}> {
    return [
      { value: 1, label: 'January' },
      { value: 2, label: 'February' },
      { value: 3, label: 'March' },
      { value: 4, label: 'April' },
      { value: 5, label: 'May' },
      { value: 6, label: 'June' },
      { value: 7, label: 'July' },
      { value: 8, label: 'August' },
      { value: 9, label: 'September' },
      { value: 10, label: 'October' },
      { value: 11, label: 'November' },
      { value: 12, label: 'December' }
    ];
  }
  
  getYears(): number[] {
    const years = [];
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i);
    }
    return years;
  }
}