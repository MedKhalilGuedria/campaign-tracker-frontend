// src/app/components/campaign-list/campaign-list.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ChartConfiguration } from 'chart.js';
import { Router } from '@angular/router';
import { CampaignService, Campaign, CampaignStats } from '../../services/campaign.service';
import { BetService, Bet } from '../../services/bet.service';
import { CurrencyService } from '../../services/currency.service';

interface CategoryStats {
  category: string;
  totalBets: number;
  totalStaked: number;
  totalProfitLoss: number;
  wins: number;
  losses: number;
  pending: number;
  void: number;
  winRate: number;
}

interface MonthlyStats {
  month: string;
  monthNumber: number;
  year: number;
  profitLoss: number;
  totalBets: number;
  totalStaked: number;
  wins: number;
  losses: number;
  winRate: number;
}

interface CampaignStatsData {
  totalProfitLoss: number;
  totalStaked: number;
  totalBets: number;
  winRate: number;
  wins: number;
  losses: number;
  pending: number;
  void: number;
}

interface CasinoStats {
  totalPlays: number;
  totalStaked: number;
  totalProfitLoss: number;
  wins: number;
  losses: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  football: '⚽',
  soccer: '⚽',
  'football (cl)': '⚽',
  'football/basketball': '⚽🏀',
  basketball: '🏀',
  tennis: '🎾',
  baseball: '⚾',
  'american football': '🏈',
  nfl: '🏈',
  rugby: '🏉',
  hockey: '🏒',
  'ice hockey': '🏒',
  boxing: '🥊',
  mma: '🥋',
  golf: '⛳',
  volleyball: '🏐',
  cricket: '🏏',
  'table tennis': '🏓',
  cycling: '🚴',
  swimming: '🏊',
  athletics: '🏃',
  running: '🏃',
  casino: '🎰',
  slots: '🎰',
  esports: '🎮',
  'horse racing': '🐎',
  horses: '🐎',
  darts: '🎯',
  snooker: '🎱',
  billiards: '🎱',
  'bonus staked': '🎁',
  bonus: '🎁',
  'lucky friday': '🍀',
  lucky: '🍀',
  unknown: '🏅',
};

function getCategoryIcon(category: string): string {
  if (!category) return '🏅';
  const lower = category.toLowerCase().trim();

  if (CATEGORY_ICONS[lower]) return CATEGORY_ICONS[lower];

  for (const key of Object.keys(CATEGORY_ICONS)) {
    if (lower.includes(key) || key.includes(lower)) {
      return CATEGORY_ICONS[key];
    }
  }

  return '🏅';
}

@Component({
  selector: 'app-campaign-list',
  templateUrl: './campaign-list.component.html',
  styleUrls: ['./campaign-list.component.scss'],
})
export class CampaignListComponent implements OnInit, OnDestroy {
  campaigns: Campaign[] = [];
  campaignsStats: Map<number, CampaignStats> = new Map();
  allBets: Bet[] = [];
  filteredBets: Bet[] = [];
  showAllBets: boolean = false;
  chartView: 'cumulative' | 'daily' | 'both' = 'both';
  activeTab: string = 'sports';
  expandedCampaignId: number | null = null;
  comparisonMetric: string = 'profit_loss';
  campaignsWithStats: any[] = [];
  
  categoryStats: CategoryStats[] = [];
  selectedCategory: string = 'all';
  availableCategories: string[] = [];
  categoriesForSelect: { value: string; label: string }[] = [];
  monthlyStats: MonthlyStats[] = [];
  showMonthlyChart: boolean = true;

  stats: CampaignStatsData = {
    totalProfitLoss: 0,
    totalStaked: 0,
    totalBets: 0,
    winRate: 0,
    wins: 0,
    losses: 0,
    pending: 0,
    void: 0,
  };

  regularBetsStats: CampaignStatsData = {
    totalProfitLoss: 0,
    totalStaked: 0,
    totalBets: 0,
    winRate: 0,
    wins: 0,
    losses: 0,
    pending: 0,
    void: 0,
  };

  casinoStats: CasinoStats = {
    totalPlays: 0,
    totalStaked: 0,
    totalProfitLoss: 0,
    wins: 0,
    losses: 0,
  };

  winLossStats = { wins: 0, losses: 0 };

  currentDate: Date = new Date();
  currentTime: string = '';
  dayOfYear: number = 0;
  yearTotalDays: number = 365;
  weekNumber: number = 0;
  timezone: string = '';
  private timeInterval: any;

  filterForm: FormGroup;
  timeFilters = [
    { value: 'all', label: 'All Time' },
    { value: '30', label: 'Last 30 Days' },
    { value: '90', label: 'Last 90 Days' },
    { value: '180', label: 'Last 6 Months' },
    { value: '365', label: 'Last Year' },
    { value: 'custom', label: 'Custom Period' },
  ];

  monthFilters = [
    { value: 'all', label: 'All Months' },
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' },
  ];

  selectedStartDate: Date | null = null;
  selectedEndDate: Date | null = null;

  public chartData!: ChartConfiguration<'line'>['data'];
  
  public monthlyChartData!: ChartConfiguration<'bar'>['data'];
  public monthlyChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            if (context.dataset.label === 'Number of Bets') {
              return `Number of Bets: ${Math.round(value || 0)}`;
            }
            if (value == null) return 'Profit/Loss: 0';
            return `Profit/Loss: ${value >= 0 ? '+' : ''}${this.currencyService.formatCurrency(value || 0)}`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Month',
          font: {
            weight: 'bold'
          }
        },
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        position: 'left',
        title: {
          display: true,
          text: 'Profit/Loss',
          font: {
            weight: 'bold'
          }
        },
        ticks: {
          callback: (value) => {
            return this.currencyService.formatCurrency(value as number);
          }
        }
      },
      y1: {
        beginAtZero: true,
        position: 'right',
        title: {
          display: true,
          text: 'Number of Bets',
          font: {
            weight: 'bold'
          }
        },
        grid: {
          drawOnChartArea: false
        },
        ticks: {
          stepSize: 1,
          callback: (value) => {
            return Math.round(value as number);
          }
        }
      }
    }
  };

  public campaignComparisonChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  public campaignComparisonChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            const metric = this.comparisonMetric;
            if (metric === 'profit_loss') {
              return `Profit/Loss: ${value != null && value >= 0 ? '+' : ''}${this.currencyService.formatCurrency(value || 0)}`;
            } else if (metric === 'total_bets') {
              return `Total Bets: ${value || 0}`;
            } else if (metric === 'win_rate') {
              return `Win Rate: ${value || 0}%`;
            } else if (metric === 'roi') {
              return `ROI: ${value || 0}%`;
            } else if (metric === 'balance_usage') {
              return `Balance Usage: ${value || 0}%`;
            }
            return `${value || 0}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: ''
        },
        ticks: {
          callback: (value) => {
            if (this.comparisonMetric === 'profit_loss') {
              return this.currencyService.formatCurrency(value as number);
            } else if (this.comparisonMetric === 'win_rate' || this.comparisonMetric === 'roi' || this.comparisonMetric === 'balance_usage') {
              return `${value}%`;
            }
            return value;
          }
        }
      }
    }
  };

  public profitLossChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    scales: {
      x: {
        title: { display: true, text: 'Date' },
        ticks: { maxTicksLimit: 10 },
      },
      y: {
        beginAtZero: false,
        title: { display: true, text: 'Profit/Loss' },
        ticks: {
          callback: (value) => {
            const num = typeof value === 'string' ? parseFloat(value) : value;
            if (isNaN(num as number)) return '0';
            return `${(num as number) >= 0 ? '+' : ''}${this.currencyService.formatCurrency(num as number)}`;
          },
        },
      },
    },
    plugins: {
      legend: { display: true, position: 'top' },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            if (value == null) return 'Profit/Loss: 0';
            return `Profit/Loss: ${value >= 0 ? '+' : ''}${this.currencyService.formatCurrency(value)}`;
          },
        },
      },
    },
  };

  public winLossChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Wins', 'Losses'],
    datasets: [
      {
        data: [0, 0],
        backgroundColor: ['#28a745', '#dc3545'],
        hoverBackgroundColor: ['#34ce57', '#e74c3c'],
        borderWidth: 0,
      },
    ],
  };

  public winLossChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
  };

  mobileResultFilter: string = 'all';
  mobileSortBy: string = 'date';
  mobileCurrentPage: number = 1;
  mobilePageSize: number = 10;
  mobileTotalPages: number = 1;
  mobileBets: Bet[] = [];

  private cumulativeData: number[] = [];
  private dailyData: number[] = [];
  private chartLabels: string[] = [];

  constructor(
    private campaignService: CampaignService,
    private betService: BetService,
    private fb: FormBuilder,
    private currencyService: CurrencyService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.filterForm = this.fb.group({
      timeFilter: ['all'],
      monthFilter: ['all'],
      categoryFilter: ['all'],
    });

    this.chartData = { labels: [], datasets: [] };
    this.monthlyChartData = { labels: [], datasets: [] };
  }

  ngOnInit(): void {
    this.loadCampaigns();
    this.loadAllBets();
    this.loadCategories();
    this.initDateTime();
    this.startDateTimeUpdate();

    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  loadCategories(): void {
    this.betService.getCategories().subscribe({
      next: (categories) => {
        this.availableCategories = categories;
        this.categoriesForSelect = [
          { value: 'all', label: 'All Categories' },
          ...categories.map(cat => ({ value: cat, label: this.formatCategoryName(cat) }))
        ];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.availableCategories = ['Football', 'Basketball', 'Tennis', 'Casino', 'Esports'];
        this.categoriesForSelect = [
          { value: 'all', label: 'All Categories' },
          ...this.availableCategories.map(cat => ({ value: cat, label: cat }))
        ];
      }
    });
  }

  formatCategoryName(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  initDateTime(): void {
    this.updateDateTime();
    this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  startDateTimeUpdate(): void {
    this.timeInterval = setInterval(() => {
      this.updateDateTimeOnly();
    }, 1000);
  }

  updateDateTime(): void {
    this.updateDateTimeOnly();
  }

  updateDateTimeOnly(): void {
    const now = new Date();
    this.currentDate = now;
    this.currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 86_400_000;
    this.dayOfYear = Math.floor(diff / oneDay);

    const y = now.getFullYear();
    this.yearTotalDays =
      (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;

    const firstDayOfYear = new Date(y, 0, 1);
    const pastDaysOfYear =
      (now.getTime() - firstDayOfYear.getTime()) / oneDay;
    this.weekNumber = Math.ceil(
      (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7
    );
  }

  loadCampaigns(): void {
    this.campaignService.getAll().subscribe((data) => {
      this.campaigns = data;
      this.loadAllCampaignsStats();
    });
  }

  loadAllCampaignsStats(): void {
    this.campaignService.getAllCampaignsStats().subscribe({
      next: (stats) => {
        stats.forEach(stat => {
          this.campaignsStats.set(stat.campaign_id, stat);
        });
        this.updateCampaignsWithStats();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading campaign stats:', error);
      }
    });
  }

  updateCampaignsWithStats(): void {
    this.campaignsWithStats = this.campaigns.map(campaign => ({
      ...campaign,
      stats: this.campaignsStats.get(campaign.id)
    })).filter(c => c.stats);
    if (this.campaignsWithStats.length > 0) {
      this.updateComparisonChart();
    }
  }

  getCampaignStats(campaignId: number): CampaignStats | undefined {
    return this.campaignsStats.get(campaignId);
  }

  toggleCampaignStats(campaignId: number): void {
    if (this.expandedCampaignId === campaignId) {
      this.expandedCampaignId = null;
    } else {
      this.expandedCampaignId = campaignId;
      if (!this.campaignsStats.has(campaignId)) {
        this.campaignService.getCampaignStats(campaignId).subscribe(stat => {
          this.campaignsStats.set(campaignId, stat);
          this.cdr.detectChanges();
        });
      }
    }
  }

  loadAllBets(): void {
    this.betService.getAllBets().subscribe((bets: Bet[]) => {
      this.allBets = bets;
      this.applyFilters();
    });
  }

  applyFilters(): void {
    let filtered = [...this.allBets];
    const timeFilter = this.filterForm.get('timeFilter')?.value || 'all';
    const monthFilter = this.filterForm.get('monthFilter')?.value;
    const categoryFilter = this.filterForm.get('categoryFilter')?.value || 'all';

    if (timeFilter !== 'all') {
      if (timeFilter === 'custom') {
        if (this.selectedStartDate) {
          filtered = filtered.filter(
            (bet) =>
              new Date(bet.created_at) >= new Date(this.selectedStartDate!)
          );
        }
        if (this.selectedEndDate) {
          filtered = filtered.filter(
            (bet) =>
              new Date(bet.created_at) <= new Date(this.selectedEndDate!)
          );
        }
      } else {
        const days = parseInt(timeFilter);
        if (!isNaN(days)) {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          filtered = filtered.filter(
            (bet) => new Date(bet.created_at) >= startDate
          );
        }
      }
    }

    if (monthFilter && monthFilter !== 'all') {
      const month = parseInt(monthFilter);
      filtered = filtered.filter(
        (bet) => new Date(bet.created_at).getMonth() === month
      );
    }

    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(
        (bet) => bet.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    this.filteredBets = filtered;
    
    this.calculateStats();
    this.calculateMonthlyStats();
    this.updateWinLossChart();
    this.prepareChartData();
    this.rebuildChartData();
    this.updateMonthlyChart();

    this.mobileResultFilter = 'all';
    this.mobileSortBy = 'date';
    this.mobileCurrentPage = 1;
    this.applyMobileFilters();
  }

  calculateMonthlyStats(): void {
    const monthlyMap = new Map<string, MonthlyStats>();
    
    this.filteredBets.forEach(bet => {
      const date = new Date(bet.created_at);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const monthName = date.toLocaleString('default', { month: 'long' });
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: `${monthName} ${date.getFullYear()}`,
          monthNumber: date.getMonth(),
          year: date.getFullYear(),
          profitLoss: 0,
          totalBets: 0,
          totalStaked: 0,
          wins: 0,
          losses: 0,
          winRate: 0
        });
      }
      
      const stats = monthlyMap.get(monthKey)!;
      stats.profitLoss += bet.profit_loss || 0;
      stats.totalBets++;
      stats.totalStaked += bet.stake || 0;
      if (bet.result === 'win') stats.wins++;
      if (bet.result === 'loss') stats.losses++;
    });
    
    monthlyMap.forEach(stats => {
      stats.winRate = stats.totalBets > 0 ? (stats.wins / stats.totalBets) * 100 : 0;
    });
    
    this.monthlyStats = Array.from(monthlyMap.values())
      .sort((a, b) => a.year - b.year || a.monthNumber - b.monthNumber);
    
    this.updateMonthlyChart();
  }

  updateMonthlyChart(): void {
    const labels = this.monthlyStats.map(m => m.month);
    const profitLossData = this.monthlyStats.map(m => m.profitLoss);
    const betCounts = this.monthlyStats.map(m => m.totalBets);
    
    this.monthlyChartData = {
      labels: labels,
      datasets: [
        {
          label: 'Monthly Profit/Loss',
          data: profitLossData,
          backgroundColor: profitLossData.map(value => 
            value >= 0 ? 'rgba(40, 167, 69, 0.7)' : 'rgba(220, 53, 69, 0.7)'
          ),
          borderColor: profitLossData.map(value => 
            value >= 0 ? 'rgb(40, 167, 69)' : 'rgb(220, 53, 69)'
          ),
          borderWidth: 2,
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.8,
          order: 1
        } as any,
        {
          label: 'Number of Bets',
          data: betCounts,
          backgroundColor: 'rgba(52, 152, 219, 0.2)',
          borderColor: 'rgb(52, 152, 219)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: 'rgb(52, 152, 219)',
          order: 0,
          yAxisID: 'y1'
        } as any
      ]
    };
  }

  calculateStats(): void {
    const allBets = this.filteredBets;
    const casinoBets = allBets.filter(
      (bet) => bet.category?.toLowerCase() === 'casino'
    );
    const regularBets = allBets.filter(
      (bet) => bet.category?.toLowerCase() !== 'casino'
    );

    const wins = allBets.filter((b) => b.result === 'win').length;
    const losses = allBets.filter((b) => b.result === 'loss').length;
    const pending = allBets.filter((b) => b.result === 'pending').length;
    const voids = allBets.filter((b) => b.result === 'void').length;

    this.stats = {
      totalProfitLoss: allBets.reduce((s, b) => s + (b.profit_loss || 0), 0),
      totalStaked: allBets.reduce((s, b) => s + (b.stake || 0), 0),
      totalBets: allBets.length,
      winRate: allBets.length > 0 ? (wins / allBets.length) * 100 : 0,
      wins,
      losses,
      pending,
      void: voids,
    };

    const rWins = regularBets.filter((b) => b.result === 'win').length;
    const rLosses = regularBets.filter((b) => b.result === 'loss').length;

    this.regularBetsStats = {
      totalProfitLoss: regularBets.reduce(
        (s, b) => s + (b.profit_loss || 0),
        0
      ),
      totalStaked: regularBets.reduce((s, b) => s + (b.stake || 0), 0),
      totalBets: regularBets.length,
      winRate:
        regularBets.length > 0
          ? (rWins / regularBets.length) * 100
          : 0,
      wins: rWins,
      losses: rLosses,
      pending: regularBets.filter((b) => b.result === 'pending').length,
      void: regularBets.filter((b) => b.result === 'void').length,
    };

    const cWins = casinoBets.filter((b) => b.result === 'win').length;
    const cLosses = casinoBets.filter((b) => b.result === 'loss').length;

    this.casinoStats = {
      totalPlays: casinoBets.length,
      totalStaked: casinoBets.reduce((s, b) => s + (b.stake || 0), 0),
      totalProfitLoss: casinoBets.reduce(
        (s, b) => s + (b.profit_loss || 0),
        0
      ),
      wins: cWins,
      losses: cLosses,
    };

    this.winLossStats = { wins, losses };
    this.calculateCategoryStats(regularBets);
  }

  calculateCategoryStats(regularBets: Bet[]): void {
    const categoryMap = new Map<string, CategoryStats>();

    regularBets.forEach((bet) => {
      const category = bet.category || 'Unknown';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          totalBets: 0,
          totalStaked: 0,
          totalProfitLoss: 0,
          wins: 0,
          losses: 0,
          pending: 0,
          void: 0,
          winRate: 0,
        });
      }

      const c = categoryMap.get(category)!;
      c.totalBets++;
      c.totalStaked += bet.stake || 0;
      c.totalProfitLoss += bet.profit_loss || 0;

      switch (bet.result) {
        case 'win':     c.wins++;    break;
        case 'loss':    c.losses++;  break;
        case 'pending': c.pending++; break;
        case 'void':    c.void++;    break;
      }
    });

    categoryMap.forEach((c) => {
      c.winRate = c.totalBets > 0 ? (c.wins / c.totalBets) * 100 : 0;
    });

    this.categoryStats = Array.from(categoryMap.values()).sort(
      (a, b) => b.totalBets - a.totalBets
    );
  }

  updateWinLossChart(): void {
    this.winLossChartData = {
      labels: ['Wins', 'Losses'],
      datasets: [
        {
          data: [this.stats.wins, this.stats.losses],
          backgroundColor: ['#28a745', '#dc3545'],
          hoverBackgroundColor: ['#34ce57', '#e74c3c'],
          borderWidth: 0,
        },
      ],
    };
  }

  prepareChartData(): void {
    if (this.filteredBets.length === 0) {
      this.chartLabels = [];
      this.cumulativeData = [];
      this.dailyData = [];
      return;
    }

    const sortedBets = [...this.filteredBets].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let cumulative = 0;
    this.chartLabels = [];
    this.cumulativeData = [];
    this.dailyData = [];

    sortedBets.forEach((bet) => {
      const dateStr = new Date(bet.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      cumulative += bet.profit_loss || 0;
      this.chartLabels.push(dateStr);
      this.cumulativeData.push(cumulative);
      this.dailyData.push(bet.profit_loss || 0);
    });
  }

  rebuildChartData(): void {
    const datasets: any[] = [];

    if (this.chartView === 'cumulative' || this.chartView === 'both') {
      datasets.push({
        label: 'Cumulative Profit/Loss',
        data: [...this.cumulativeData],
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
      });
    }

    if (this.chartView === 'daily' || this.chartView === 'both') {
      datasets.push({
        label: 'Daily Profit/Loss',
        data: [...this.dailyData],
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderWidth: 2,
        borderDash: this.chartView === 'both' ? [5, 5] : undefined,
        fill: false,
      });
    }

    this.chartData = {
      labels: [...this.chartLabels],
      datasets,
    };
  }

  updateComparisonChart(): void {
    const labels = this.campaignsWithStats.map(c => c.name);
    let data: number[] = [];
    let label = '';
    let backgroundColor = '';

    switch(this.comparisonMetric) {
      case 'profit_loss':
        data = this.campaignsWithStats.map(c => c.stats?.total_profit_loss || 0);
        label = 'Profit / Loss';
        backgroundColor = 'rgba(40, 167, 69, 0.7)';
        break;
      case 'total_bets':
        data = this.campaignsWithStats.map(c => c.stats?.total_bets || 0);
        label = 'Total Bets';
        backgroundColor = 'rgba(52, 152, 219, 0.7)';
        break;
      case 'win_rate':
        data = this.campaignsWithStats.map(c => c.stats?.win_rate || 0);
        label = 'Win Rate (%)';
        backgroundColor = 'rgba(255, 193, 7, 0.7)';
        break;
      case 'roi':
        data = this.campaignsWithStats.map(c => c.stats?.roi || 0);
        label = 'ROI (%)';
        backgroundColor = 'rgba(23, 162, 184, 0.7)';
        break;
      case 'balance_usage':
        data = this.campaignsWithStats.map(c => c.stats?.balance_utilization || 0);
        label = 'Balance Usage (%)';
        backgroundColor = 'rgba(111, 66, 193, 0.7)';
        break;
    }

    this.campaignComparisonChartData = {
      labels: labels,
      datasets: [{
        label: label,
        data: data,
        backgroundColor: backgroundColor,
        borderColor: backgroundColor.replace('0.7', '1'),
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.8
      }]
    };

    if (this.campaignComparisonChartOptions && 
        this.campaignComparisonChartOptions.scales && 
        this.campaignComparisonChartOptions.scales['y']) {
      const yScale = this.campaignComparisonChartOptions.scales['y'];
      if (yScale && yScale.title) {
        yScale.title.text = this.getMetricLabel();
      }
    }
  }

  setChartView(view: 'cumulative' | 'daily' | 'both'): void {
    this.chartView = view;
    this.rebuildChartData();
  }

  setComparisonMetric(metric: string): void {
    this.comparisonMetric = metric;
    this.updateComparisonChart();
  }

  getMetricLabel(): string {
    switch(this.comparisonMetric) {
      case 'profit_loss': return 'Profit / Loss';
      case 'total_bets': return 'Number of Bets';
      case 'win_rate': return 'Win Rate (%)';
      case 'roi': return 'ROI (%)';
      case 'balance_usage': return 'Balance Usage (%)';
      default: return '';
    }
  }

  getMetricUnit(): string {
    switch(this.comparisonMetric) {
      case 'profit_loss': return '';
      case 'total_bets': return 'bets';
      case 'win_rate': return '%';
      case 'roi': return '%';
      case 'balance_usage': return '%';
      default: return '';
    }
  }

  getBestCampaignName(): string {
    if (this.campaignsWithStats.length === 0) return '-';
    
    let bestCampaign = this.campaignsWithStats[0];
    let bestValue = -Infinity;
    
    for (const campaign of this.campaignsWithStats) {
      let currentValue = 0;
      
      switch(this.comparisonMetric) {
        case 'profit_loss':
          currentValue = campaign.stats?.total_profit_loss || 0;
          break;
        case 'total_bets':
          currentValue = campaign.stats?.total_bets || 0;
          break;
        case 'win_rate':
          currentValue = campaign.stats?.win_rate || 0;
          break;
        case 'roi':
          currentValue = campaign.stats?.roi || 0;
          break;
        case 'balance_usage':
          currentValue = campaign.stats?.balance_utilization || 0;
          break;
      }
      
      if (currentValue > bestValue) {
        bestValue = currentValue;
        bestCampaign = campaign;
      }
    }
    
    return bestCampaign.name;
  }

  getBestCampaignValue(): number {
    if (this.campaignsWithStats.length === 0) return 0;
    
    let bestValue = -Infinity;
    for (const campaign of this.campaignsWithStats) {
      let value = 0;
      switch(this.comparisonMetric) {
        case 'profit_loss':
          value = campaign.stats?.total_profit_loss || 0;
          break;
        case 'total_bets':
          value = campaign.stats?.total_bets || 0;
          break;
        case 'win_rate':
          value = campaign.stats?.win_rate || 0;
          break;
        case 'roi':
          value = campaign.stats?.roi || 0;
          break;
        case 'balance_usage':
          value = campaign.stats?.balance_utilization || 0;
          break;
      }
      if (value > bestValue) bestValue = value;
    }
    
    return bestValue === -Infinity ? 0 : bestValue;
  }

  getAverageMetricValue(): number {
    if (this.campaignsWithStats.length === 0) return 0;
    
    let sum = 0;
    let count = 0;
    for (const campaign of this.campaignsWithStats) {
      switch(this.comparisonMetric) {
        case 'profit_loss':
          if (campaign.stats?.total_profit_loss !== undefined) {
            sum += campaign.stats.total_profit_loss;
            count++;
          }
          break;
        case 'total_bets':
          sum += campaign.stats?.total_bets || 0;
          count++;
          break;
        case 'win_rate':
          sum += campaign.stats?.win_rate || 0;
          count++;
          break;
        case 'roi':
          if (campaign.stats?.roi !== undefined) {
            sum += campaign.stats.roi;
            count++;
          }
          break;
        case 'balance_usage':
          sum += campaign.stats?.balance_utilization || 0;
          count++;
          break;
      }
    }
    
    return count > 0 ? sum / count : 0;
  }

  getActiveCampaignsCount(): number {
    return this.campaignsWithStats.filter(c => (c.stats?.total_bets || 0) > 0).length;
  }

  getPerformanceBarWidth(campaign: any): number {
    if (!campaign.stats) return 0;
    
    let maxValue = 0;
    for (const c of this.campaignsWithStats) {
      if (!c.stats) continue;
      let value = 0;
      switch(this.comparisonMetric) {
        case 'profit_loss':
          value = Math.abs(c.stats.total_profit_loss || 0);
          break;
        case 'total_bets':
          value = c.stats.total_bets || 0;
          break;
        case 'win_rate':
          value = c.stats.win_rate || 0;
          break;
        case 'roi':
          value = Math.abs(c.stats.roi || 0);
          break;
        case 'balance_usage':
          value = c.stats.balance_utilization || 0;
          break;
      }
      if (value > maxValue) maxValue = value;
    }
    
    if (maxValue === 0) return 0;
    
    let currentValue = 0;
    switch(this.comparisonMetric) {
      case 'profit_loss':
        currentValue = Math.abs(campaign.stats.total_profit_loss || 0);
        break;
      case 'total_bets':
        currentValue = campaign.stats.total_bets || 0;
        break;
      case 'win_rate':
        currentValue = campaign.stats.win_rate || 0;
        break;
      case 'roi':
        currentValue = Math.abs(campaign.stats.roi || 0);
        break;
      case 'balance_usage':
        currentValue = campaign.stats.balance_utilization || 0;
        break;
    }
    
    return (currentValue / maxValue) * 100;
  }

  getTotalProfitLossAllCampaigns(): number {
    return this.campaignsWithStats.reduce((sum, c) => {
      return sum + (c.stats?.total_profit_loss || 0);
    }, 0);
  }

  getTotalBetsAllCampaigns(): number {
    return this.campaignsWithStats.reduce((sum, c) => {
      return sum + (c.stats?.total_bets || 0);
    }, 0);
  }

  getAverageWinRateAllCampaigns(): number {
    const totalBets = this.getTotalBetsAllCampaigns();
    if (totalBets === 0) return 0;
    
    let weightedWins = 0;
    for (const campaign of this.campaignsWithStats) {
      weightedWins += (campaign.stats?.wins || 0);
    }
    
    return (weightedWins / totalBets) * 100;
  }

  getTotalBalanceAllCampaigns(): number {
    return this.campaigns.reduce((sum, c) => sum + (c.current_balance || 0), 0);
  }

  getBestMonth(): MonthlyStats | null {
    if (this.monthlyStats.length === 0) return null;
    return this.monthlyStats.reduce((best, current) => 
      current.profitLoss > best.profitLoss ? current : best
    );
  }

  getWorstMonth(): MonthlyStats | null {
    if (this.monthlyStats.length === 0) return null;
    return this.monthlyStats.reduce((worst, current) => 
      current.profitLoss < worst.profitLoss ? current : worst
    );
  }

  getAverageMonthlyProfitLoss(): number {
    if (this.monthlyStats.length === 0) return 0;
    const total = this.monthlyStats.reduce((sum, m) => sum + m.profitLoss, 0);
    return total / this.monthlyStats.length;
  }

  getProfitableMonthsCount(): number {
    return this.monthlyStats.filter(m => m.profitLoss > 0).length;
  }

  getCategoryIcon(category: string): string {
    return getCategoryIcon(category);
  }

  onDateChange(): void {
    if (this.selectedStartDate || this.selectedEndDate) {
      this.filterForm.get('timeFilter')?.setValue('custom');
      this.applyFilters();
    }
  }

  resetFilters(): void {
    this.filterForm.patchValue({ 
      timeFilter: 'all', 
      monthFilter: 'all',
      categoryFilter: 'all'
    });
    this.selectedStartDate = null;
    this.selectedEndDate = null;
    this.applyFilters();
  }

  viewCampaignDetails(campaignId: number): void {
    this.router.navigate(['/campaigns', campaignId]);
  }

  toggleAllBets(): void {
    this.showAllBets = !this.showAllBets;
    if (this.showAllBets) {
      setTimeout(() => {
        document
          .querySelector('.all-bets-section')
          ?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }

  viewBetDetails(bet: Bet): void {
    console.log('View bet details:', bet);
  }

  getCampaignName(campaignId: number): string {
    const campaign = this.campaigns.find((c) => c.id === campaignId);
    return campaign ? campaign.name : 'Unknown Campaign';
  }

  getRecentBets(limit: number = 5): Bet[] {
    return [...this.filteredBets]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
      .slice(0, limit);
  }

  getBiggestWin(): number {
    const wins = this.filteredBets.filter((b) => b.profit_loss > 0);
    return wins.length === 0 ? 0 : Math.max(...wins.map((b) => b.profit_loss));
  }

  getBiggestLoss(): number {
    const losses = this.filteredBets.filter((b) => b.profit_loss < 0);
    return losses.length === 0
      ? 0
      : Math.min(...losses.map((b) => b.profit_loss));
  }

  getNetFlow(): number {
    return this.getTotalDeposits() - this.getTotalWithdrawals();
  }

  getTotalBalance(): number {
    return this.campaigns.reduce(
      (s, c) => s + c.current_balance,
      0
    );
  }

  getTotalDeposits(): number {
    return this.campaigns.reduce(
      (s, c) => s + c.total_deposits,
      0
    );
  }

  getTotalWithdrawals(): number {
    return this.campaigns.reduce(
      (s, c) => s + c.total_withdrawals,
      0
    );
  }

  getTotalStaked(): number {
    return this.filteredBets.reduce((s, b) => s + b.stake, 0);
  }

  get paginatedBets(): Bet[] {
    return this.filteredBets.slice(0, 50);
  }

  get paginatedMobileBets(): Bet[] {
    const start = (this.mobileCurrentPage - 1) * this.mobilePageSize;
    return this.mobileBets.slice(start, start + this.mobilePageSize);
  }

  filterMobileBets(result: string): void {
    this.mobileResultFilter = result;
    this.mobileCurrentPage = 1;
    this.applyMobileFilters();
  }

  sortMobileBets(sortBy: string): void {
    this.mobileSortBy = sortBy;
    this.applyMobileFilters();
  }

  applyMobileFilters(): void {
    let bets = [...this.filteredBets];

    if (this.mobileResultFilter !== 'all') {
      bets = bets.filter((b) => b.result === this.mobileResultFilter);
    }

    switch (this.mobileSortBy) {
      case 'date':
        bets.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
        break;
      case 'profit':
        bets.sort((a, b) => b.profit_loss - a.profit_loss);
        break;
      case 'stake':
        bets.sort((a, b) => b.stake - a.stake);
        break;
    }

    this.mobileBets = bets;
    this.mobileTotalPages = Math.ceil(bets.length / this.mobilePageSize);
  }

  previousMobilePage(): void {
    if (this.mobileCurrentPage > 1) this.mobileCurrentPage--;
  }

  nextMobilePage(): void {
    if (this.mobileCurrentPage < this.mobileTotalPages)
      this.mobileCurrentPage++;
  }

  onMobilePageSizeChange(): void {
    this.mobileCurrentPage = 1;
    this.mobileTotalPages = Math.ceil(
      this.mobileBets.length / this.mobilePageSize
    );
  }
}