import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ChartConfiguration } from 'chart.js';
import { Router } from '@angular/router';
import { CampaignService, Campaign } from '../../services/campaign.service';
import { BetService, Bet } from '../../services/bet.service';
import { CurrencyService } from '../../services/currency.service';

interface CampaignStats {
  totalProfitLoss: number;
  totalStaked: number;
  totalBets: number;
  winRate: number;
  wins: number;
  losses: number;
  pending: number;
  void: number;
}

interface SportStats {
  sport: string;
  totalBets: number;
  totalStaked: number;
  totalProfitLoss: number;
  wins: number;
  losses: number;
  pending: number;
  void: number;
  winRate: number;
}

interface CasinoStats {
  totalPlays: number;
  totalStaked: number;
  totalProfitLoss: number;
  wins: number;
  losses: number;
}

// ─── Sport icon mapping ───────────────────────────────────────────────────────
const SPORT_ICONS: Record<string, string> = {
  // Football / Soccer variants
  football: '⚽',
  soccer: '⚽',
  'football (cl)': '⚽',
  'football/basketball': '⚽🏀',
  // Basketball
  basketball: '🏀',
  // Tennis
  tennis: '🎾',
  // Baseball
  baseball: '⚾',
  // American Football
  'american football': '🏈',
  nfl: '🏈',
  // Rugby
  rugby: '🏉',
  // Hockey / Ice Hockey
  hockey: '🏒',
  'ice hockey': '🏒',
  // Boxing / MMA
  boxing: '🥊',
  mma: '🥋',
  // Golf
  golf: '⛳',
  // Volleyball
  volleyball: '🏐',
  // Cricket
  cricket: '🏏',
  // Table Tennis
  'table tennis': '🏓',
  // Cycling
  cycling: '🚴',
  // Swimming
  swimming: '🏊',
  // Athletics / Running
  athletics: '🏃',
  running: '🏃',
  // Casino
  casino: '🎰',
  slots: '🎰',
  // Esports
  esports: '🎮',
  // Horse Racing
  'horse racing': '🐎',
  horses: '🐎',
  // Darts
  darts: '🎯',
  // Snooker / Billiards
  snooker: '🎱',
  billiards: '🎱',
  // Bonus / Special
  'bonus staked': '🎁',
  bonus: '🎁',
  // Lucky / Special campaigns
  'lucky friday': '🍀',
  lucky: '🍀',
  // Default
  unknown: '🏅',
};

/**
 * Returns the best-matching emoji for a given sport name.
 * Tries exact match first, then partial/keyword match, then falls back to 🏅.
 */
function getSportIcon(sport: string): string {
  if (!sport) return '🏅';
  const lower = sport.toLowerCase().trim();

  // Exact match
  if (SPORT_ICONS[lower]) return SPORT_ICONS[lower];

  // Partial match — iterate keys, pick first that is contained in the sport name
  for (const key of Object.keys(SPORT_ICONS)) {
    if (lower.includes(key) || key.includes(lower)) {
      return SPORT_ICONS[key];
    }
  }

  return '🏅';
}

@Component({
  selector: 'app-campaign-list',
  templateUrl: './campaign-list.component.html',
  styleUrls: ['./campaign-list.component.scss'],
  // Using Default (not OnPush) so Angular updates normally,
  // but we manually control when chart data is rebuilt.
})
export class CampaignListComponent implements OnInit, OnDestroy {
  campaigns: Campaign[] = [];
  allBets: Bet[] = [];
  filteredBets: Bet[] = [];
  showAllBets: boolean = false;
  chartView: 'cumulative' | 'daily' | 'both' = 'both';
  activeTab: string = 'sports';

  stats: CampaignStats = {
    totalProfitLoss: 0,
    totalStaked: 0,
    totalBets: 0,
    winRate: 0,
    wins: 0,
    losses: 0,
    pending: 0,
    void: 0,
  };

  regularBetsStats: CampaignStats = {
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

  sportStats: SportStats[] = [];
  selectedSport: string = 'all';

  winLossStats = { wins: 0, losses: 0 };

  // ── Date / Time ──────────────────────────────────────────────────────────────
  currentDate: Date = new Date();
  currentTime: string = '';
  dayOfYear: number = 0;
  yearTotalDays: number = 365;
  weekNumber: number = 0;
  timezone: string = '';
  private timeInterval: any;

  // ── Filters ──────────────────────────────────────────────────────────────────
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

  // ── Chart — stored as a property so the template doesn't call a method ───────
  // This is the KEY fix: the template binds to `chartData` (a property),
  // not to `getChartData()` (a method), so Chart.js won't re-render on every
  // change-detection tick triggered by the 1-second timer.
  public chartData!: ChartConfiguration<'line'>['data'];

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

  // ── Mobile ───────────────────────────────────────────────────────────────────
  mobileResultFilter: string = 'all';
  mobileSortBy: string = 'date';
  mobileCurrentPage: number = 1;
  mobilePageSize: number = 10;
  mobileTotalPages: number = 1;
  mobileBets: Bet[] = [];

  // ── Internal chart state ─────────────────────────────────────────────────────
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
    });

    // Initialise chart data so binding is never undefined
    this.chartData = { labels: [], datasets: [] };
  }

  ngOnInit(): void {
    this.loadCampaigns();
    this.loadAllBets();
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

  // ── DateTime ─────────────────────────────────────────────────────────────────

  initDateTime(): void {
    this.updateDateTime();
    this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  startDateTimeUpdate(): void {
    // Only update time-related fields — NOT chart data — every second.
    this.timeInterval = setInterval(() => {
      this.updateDateTimeOnly();
    }, 1000);
  }

  /**
   * Full update (called once at init, and whenever bets/filters change).
   */
  updateDateTime(): void {
    this.updateDateTimeOnly();
  }

  /**
   * Lightweight update called by the 1-second interval.
   * Only touches currentDate / currentTime / dayOfYear / weekNumber.
   * Does NOT touch chart data, so Chart.js is unaffected.
   */
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

  // ── Data loading ─────────────────────────────────────────────────────────────

  loadCampaigns(): void {
    this.campaignService.getAll().subscribe((data) => {
      this.campaigns = data;
    });
  }

  loadAllBets(): void {
    this.betService.getAllBets().subscribe((bets: Bet[]) => {
      this.allBets = bets;
      this.applyFilters();
    });
  }

  // ── Filtering ────────────────────────────────────────────────────────────────

  applyFilters(): void {
    let filtered = [...this.allBets];
    const timeFilter = this.filterForm.get('timeFilter')?.value || 'all';
    const monthFilter = this.filterForm.get('monthFilter')?.value;

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

    this.filteredBets = filtered;
    this.calculateStats();
    this.updateWinLossChart();
    this.prepareChartData();   // rebuilds cumulativeData / dailyData
    this.rebuildChartData();   // commits to this.chartData (the bound property)

    this.mobileResultFilter = 'all';
    this.mobileSortBy = 'date';
    this.mobileCurrentPage = 1;
    this.applyMobileFilters();
  }

  // ── Stats ────────────────────────────────────────────────────────────────────

  calculateStats(): void {
    const allBets = this.filteredBets;
    const casinoBets = allBets.filter(
      (bet) => bet.sport?.toLowerCase() === 'casino'
    );
    const regularBets = allBets.filter(
      (bet) => bet.sport?.toLowerCase() !== 'casino'
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
    this.calculateSportStats(regularBets);
  }

  calculateSportStats(regularBets: Bet[]): void {
    const sportMap = new Map<string, SportStats>();

    regularBets.forEach((bet) => {
      const sport = bet.sport || 'Unknown';
      if (!sportMap.has(sport)) {
        sportMap.set(sport, {
          sport,
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

      const s = sportMap.get(sport)!;
      s.totalBets++;
      s.totalStaked += bet.stake || 0;
      s.totalProfitLoss += bet.profit_loss || 0;

      switch (bet.result) {
        case 'win':     s.wins++;    break;
        case 'loss':    s.losses++;  break;
        case 'pending': s.pending++; break;
        case 'void':    s.void++;    break;
      }
    });

    sportMap.forEach((s) => {
      s.winRate = s.totalBets > 0 ? (s.wins / s.totalBets) * 100 : 0;
    });

    this.sportStats = Array.from(sportMap.values()).sort(
      (a, b) => b.totalBets - a.totalBets
    );
  }

  // ── Chart ────────────────────────────────────────────────────────────────────

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

  /**
   * Commit the current cumulative/daily arrays to `this.chartData`.
   * Called only when bets or the view toggle change — NOT every second.
   */
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

    // Assign a new object reference so Angular detects the change once
    this.chartData = {
      labels: [...this.chartLabels],
      datasets,
    };
  }

  setChartView(view: 'cumulative' | 'daily' | 'both'): void {
    this.chartView = view;
    this.rebuildChartData(); // only re-renders chart when user explicitly toggles
  }

  // ── Sport icon helper (used in template) ─────────────────────────────────────

  getSportIcon(sport: string): string {
    return getSportIcon(sport);
  }

  // ── Misc handlers ────────────────────────────────────────────────────────────

  onDateChange(): void {
    if (this.selectedStartDate || this.selectedEndDate) {
      this.filterForm.get('timeFilter')?.setValue('custom');
      this.applyFilters();
    }
  }

  resetFilters(): void {
    this.filterForm.patchValue({ timeFilter: 'all', monthFilter: 'all' });
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

  // ── Pagination ───────────────────────────────────────────────────────────────

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