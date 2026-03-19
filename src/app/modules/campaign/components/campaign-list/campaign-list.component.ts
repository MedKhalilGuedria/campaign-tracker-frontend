import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-campaign-list',
  templateUrl: './campaign-list.component.html',
  styleUrls: ['./campaign-list.component.scss']
})
export class CampaignListComponent implements OnInit {
  campaigns: Campaign[] = [];
  allBets: Bet[] = [];
  filteredBets: Bet[] = [];
  showAllBets: boolean = false;
  chartView: 'cumulative' | 'daily' | 'both' = 'both';
  
  stats: CampaignStats = {
    totalProfitLoss: 0,
    totalStaked: 0,
    totalBets: 0,
    winRate: 0,
    wins: 0,
    losses: 0,
    pending: 0,
    void: 0
  };
  
  winLossStats = {
    wins: 0,
    losses: 0
  };
  
  // Filter options
  filterForm: FormGroup;
  timeFilters = [
    { value: 'all', label: 'All Time' },
    { value: '30', label: 'Last 30 Days' },
    { value: '90', label: 'Last 90 Days' },
    { value: '180', label: 'Last 6 Months' },
    { value: '365', label: 'Last Year' },
    { value: 'custom', label: 'Custom Period' }
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
    { value: '11', label: 'December' }
  ];

  selectedStartDate: Date | null = null;
  selectedEndDate: Date | null = null;
  
  // Chart properties
  private cumulativeData: number[] = [];
  private dailyData: number[] = [];
  private chartLabels: string[] = [];

  public profitLossChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: { display: true, text: 'Date' },
        ticks: { maxTicksLimit: 10 }
      },
      y: {
        beginAtZero: false,
        title: { display: true, text: 'Profit/Loss' },
        ticks: {
          callback: (value) => {
            if (typeof value === 'string') {
              const num = parseFloat(value);
              return isNaN(num) ? '0' : `${num >= 0 ? '+' : ''}${this.currencyService.formatCurrency(num)}`;
            }
            if (typeof value === 'number') {
              return `${value >= 0 ? '+' : ''}${this.currencyService.formatCurrency(value)}`;
            }
            return '0';
          }
        }
      }
    },
    plugins: {
      legend: { display: true, position: 'top' },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            if (value === null || value === undefined) return 'Profit/Loss: 0';
            const formatted = this.currencyService.formatCurrency(value);
            return `Profit/Loss: ${value >= 0 ? '+' : ''}${formatted}`;
          }
        }
      }
    }
  };

  public winLossChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Wins', 'Losses'],
    datasets: [{
      data: [0, 0],
      backgroundColor: ['#28a745', '#dc3545'],
      hoverBackgroundColor: ['#34ce57', '#e74c3c'],
      borderWidth: 0
    }]
  };

  public winLossChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    }
  };

  // Mobile properties
  mobileResultFilter: string = 'all';
  mobileSortBy: string = 'date';
  mobileCurrentPage: number = 1;
  mobilePageSize: number = 10;
  mobileTotalPages: number = 1;
  mobileBets: Bet[] = [];

  constructor(
    private campaignService: CampaignService,
    private betService: BetService,
    private fb: FormBuilder,
    private currencyService: CurrencyService,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      timeFilter: ['all'],
      monthFilter: ['all']
    });
  }

  ngOnInit(): void {
    this.loadCampaigns();
    this.loadAllBets();
    
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  loadCampaigns(): void {
    this.campaignService.getAll().subscribe(data => {
      this.campaigns = data;
    });
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

    // Apply time filter
    if (timeFilter !== 'all') {
      if (timeFilter === 'custom') {
        const startDate = this.selectedStartDate;
        const endDate = this.selectedEndDate;
        
        if (startDate) {
          filtered = filtered.filter(bet => new Date(bet.created_at) >= new Date(startDate));
        }
        if (endDate) {
          filtered = filtered.filter(bet => new Date(bet.created_at) <= new Date(endDate));
        }
      } else {
        const days = parseInt(timeFilter);
        if (!isNaN(days)) {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          filtered = filtered.filter(bet => new Date(bet.created_at) >= startDate);
        }
      }
    }

    // Apply month filter
    if (monthFilter && monthFilter !== 'all') {
      const month = parseInt(monthFilter);
      filtered = filtered.filter(bet => {
        const betDate = new Date(bet.created_at);
        return betDate.getMonth() === month;
      });
    }

    this.filteredBets = filtered;
    this.calculateStats();
    this.updateWinLossChart();
    this.prepareChartData();
    
    // Reset mobile filters when main filters change
    this.mobileResultFilter = 'all';
    this.mobileSortBy = 'date';
    this.mobileCurrentPage = 1;
    this.applyMobileFilters();
  }

  calculateStats(): void {
    const allBets = this.filteredBets;
    
    const totalProfitLoss = allBets.reduce((sum, bet) => sum + (bet.profit_loss || 0), 0);
    const totalStaked = allBets.reduce((sum, bet) => sum + (bet.stake || 0), 0);
    const totalBets = allBets.length;
    const wins = allBets.filter(bet => bet.result === 'win').length;
    const losses = allBets.filter(bet => bet.result === 'loss').length;
    const pending = allBets.filter(bet => bet.result === 'pending').length;
    const voids = allBets.filter(bet => bet.result === 'void').length;
    const winRate = totalBets > 0 ? (wins / totalBets) * 100 : 0;
    
    this.stats = {
      totalProfitLoss,
      totalStaked,
      totalBets,
      winRate,
      wins,
      losses,
      pending,
      void: voids
    };
    
    this.winLossStats = {
      wins,
      losses
    };
  }

  updateWinLossChart(): void {
    this.winLossChartData = {
      labels: ['Wins', 'Losses'],
      datasets: [{
        data: [this.stats.wins, this.stats.losses],
        backgroundColor: ['#28a745', '#dc3545'],
        hoverBackgroundColor: ['#34ce57', '#e74c3c'],
        borderWidth: 0
      }]
    };
  }

  prepareChartData(): void {
    if (this.filteredBets.length === 0) {
      this.chartLabels = [];
      this.cumulativeData = [];
      this.dailyData = [];
      return;
    }
    
    const sortedBets = [...this.filteredBets].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    let cumulativeProfitLoss = 0;
    this.chartLabels = [];
    this.cumulativeData = [];
    this.dailyData = [];
    
    sortedBets.forEach(bet => {
      const date = new Date(bet.created_at);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      cumulativeProfitLoss += bet.profit_loss || 0;
      
      this.chartLabels.push(dateStr);
      this.cumulativeData.push(cumulativeProfitLoss);
      this.dailyData.push(bet.profit_loss || 0);
    });
  }

  getChartData(): ChartConfiguration<'line'>['data'] {
    const datasets = [];
    
    if (this.chartView === 'cumulative' || this.chartView === 'both') {
      datasets.push({
        label: 'Cumulative Profit/Loss',
        data: this.cumulativeData,
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3
      });
    }
    
    if (this.chartView === 'daily' || this.chartView === 'both') {
      datasets.push({
        label: 'Daily Profit/Loss',
        data: this.dailyData,
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderWidth: 2,
        borderDash: this.chartView === 'both' ? [5, 5] : undefined,
        fill: false
      });
    }
    
    return {
      labels: this.chartLabels,
      datasets
    };
  }

  setChartView(view: 'cumulative' | 'daily' | 'both'): void {
    this.chartView = view;
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
      monthFilter: 'all'
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
        document.querySelector('.all-bets-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }

  viewBetDetails(bet: Bet): void {
    console.log('View bet details:', bet);
    // this.router.navigate(['/bets', bet.id]);
  }

  getCampaignName(campaignId: number): string {
    const campaign = this.campaigns.find(c => c.id === campaignId);
    return campaign ? campaign.name : 'Unknown Campaign';
  }

  getRecentBets(limit: number = 5): Bet[] {
    return [...this.filteredBets]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  getBiggestWin(): number {
    const wins = this.filteredBets.filter(bet => bet.profit_loss > 0);
    if (wins.length === 0) return 0;
    return Math.max(...wins.map(bet => bet.profit_loss));
  }

  getBiggestLoss(): number {
    const losses = this.filteredBets.filter(bet => bet.profit_loss < 0);
    if (losses.length === 0) return 0;
    return Math.min(...losses.map(bet => bet.profit_loss));
  }

  getNetFlow(): number {
    return this.getTotalDeposits() - this.getTotalWithdrawals();
  }

  getTotalBalance(): number {
    return this.campaigns.reduce((sum, campaign) => sum + campaign.current_balance, 0);
  }

  getTotalDeposits(): number {
    return this.campaigns.reduce((sum, campaign) => sum + campaign.total_deposits, 0);
  }

  getTotalWithdrawals(): number {
    return this.campaigns.reduce((sum, campaign) => sum + campaign.total_withdrawals, 0);
  }

  getTotalStaked(): number {
    return this.filteredBets.reduce((sum, bet) => sum + bet.stake, 0);
  }

  // Computed property for paginated desktop bets
  get paginatedBets(): Bet[] {
    return this.filteredBets.slice(0, 50); // Show first 50 in desktop view
  }

  // Computed property for paginated mobile bets
  get paginatedMobileBets(): Bet[] {
    const start = (this.mobileCurrentPage - 1) * this.mobilePageSize;
    const end = start + this.mobilePageSize;
    return this.mobileBets.slice(start, end);
  }

  // Filter mobile bets by result
  filterMobileBets(result: string): void {
    this.mobileResultFilter = result;
    this.applyMobileFilters();
    this.mobileCurrentPage = 1;
  }

  // Sort mobile bets
  sortMobileBets(sortBy: string): void {
    this.mobileSortBy = sortBy;
    this.applyMobileFilters();
  }

  // Apply filters and sorting to mobile bets
  applyMobileFilters(): void {
    let bets = [...this.filteredBets];
    
    // Apply result filter
    if (this.mobileResultFilter !== 'all') {
      bets = bets.filter(bet => bet.result === this.mobileResultFilter);
    }
    
    // Apply sorting
    switch (this.mobileSortBy) {
      case 'date':
        bets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

  // Mobile pagination methods
  previousMobilePage(): void {
    if (this.mobileCurrentPage > 1) {
      this.mobileCurrentPage--;
    }
  }

  nextMobilePage(): void {
    if (this.mobileCurrentPage < this.mobileTotalPages) {
      this.mobileCurrentPage++;
    }
  }

  onMobilePageSizeChange(): void {
    this.mobileCurrentPage = 1;
    this.mobileTotalPages = Math.ceil(this.mobileBets.length / this.mobilePageSize);
  }
}