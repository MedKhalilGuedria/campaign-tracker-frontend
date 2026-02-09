import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ChartConfiguration } from 'chart.js';
import { CampaignService, Campaign } from '../../services/campaign.service';
import { BetService, Bet } from '../../services/bet.service';
import { CurrencyService } from '../../services/currency.service';

interface CampaignStats {
  totalProfitLoss: number;
  totalStaked: number;
  totalBets: number;
  winRate: number;
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
  displayedBets: Bet[] = [];
  stats: CampaignStats = {
    totalProfitLoss: 0,
    totalStaked: 0,
    totalBets: 0,
    winRate: 0
  };
  
  // Filter options
  filterForm: FormGroup;
  timeFilters = [
    { value: 'all', label: 'All Time' },
    { value: '30', label: 'Last 30 Days' },
    { value: '90', label: 'Last 90 Days' },
    { value: 'custom', label: 'Custom Period' }
  ];
  
  nameFilters = [
    { value: 'all', label: 'All Campaigns' },
    { value: 'contains', label: 'Contains "Campaign"' },
    { value: 'not-contains', label: 'Does Not Contain "Campaign"' }
  ];

  showDatePicker = false;
  selectedStartDate: Date | null = null;
  selectedEndDate: Date | null = null;
  
  // Mobile view properties
  isLoadingMore = false;
  hasMoreBets = false;
  mobilePageSize = 10;
  mobileCurrentPage = 1;
  activeResultFilter = 'all';
  
  // Chart properties
  public profitLossChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  public profitLossChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date'
        },
        ticks: {
          maxTicksLimit: 10
        }
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Profit/Loss'
        },
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
      legend: {
        display: true,
        position: 'top'
      },
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

  constructor(
    private campaignService: CampaignService,
    private betService: BetService,
    private fb: FormBuilder,
    private currencyService: CurrencyService
  ) {
    this.filterForm = this.fb.group({
      timeFilter: ['all'],
      nameFilter: ['all']
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
      this.calculateStats();
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
    const nameFilter = this.filterForm.get('nameFilter')?.value || 'all';

    // Apply time filter
    if (timeFilter !== 'all') {
      if (timeFilter === 'custom') {
        const startDate = this.selectedStartDate;
        const endDate = this.selectedEndDate;
        
        if (startDate) {
          filtered = filtered.filter(bet => 
            new Date(bet.created_at) >= startDate
          );
        }
        if (endDate) {
          filtered = filtered.filter(bet => 
            new Date(bet.created_at) <= endDate
          );
        }
      } else {
        const days = parseInt(timeFilter);
        if (!isNaN(days)) {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          
          filtered = filtered.filter(bet => 
            new Date(bet.created_at) >= startDate
          );
        }
      }
    }

    // Apply name filter
    if (nameFilter !== 'all') {
      const campaignNames = this.campaigns.map(c => ({
        id: c.id,
        name: c.name.toLowerCase()
      }));
      
      filtered = filtered.filter(bet => {
        const campaign = campaignNames.find(c => c.id === bet.campaign_id);
        if (!campaign) return false;
        
        const containsCampaign = campaign.name.includes('campaign');
        return nameFilter === 'contains' ? containsCampaign : !containsCampaign;
      });
    }

    // Apply result filter for mobile
    if (this.activeResultFilter !== 'all') {
      filtered = filtered.filter(bet => bet.result === this.activeResultFilter);
    }

    this.filteredBets = filtered;
    this.mobileCurrentPage = 1;
    this.updateDisplayedBets();
    this.calculateStats();
    this.updateProfitLossChart();
  }

  calculateStats(): void {
    const allBets = this.filteredBets;
    
    const totalProfitLoss = allBets.reduce((sum, bet) => sum + (bet.profit_loss || 0), 0);
    const totalStaked = allBets.reduce((sum, bet) => sum + (bet.stake || 0), 0);
    const totalBets = allBets.length;
    const winningBets = allBets.filter(bet => bet.result === 'win').length;
    const winRate = totalBets > 0 ? (winningBets / totalBets) * 100 : 0;
    
    this.stats = {
      totalProfitLoss,
      totalStaked,
      totalBets,
      winRate
    };
  }

  updateProfitLossChart(): void {
    if (this.filteredBets.length === 0) return;
    
    const sortedBets = [...this.filteredBets].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    let cumulativeProfitLoss = 0;
    const dates: string[] = [];
    const cumulativeData: number[] = [];
    
    sortedBets.forEach(bet => {
      const date = new Date(bet.created_at);
      const dateStr = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      cumulativeProfitLoss += bet.profit_loss || 0;
      
      dates.push(dateStr);
      cumulativeData.push(cumulativeProfitLoss);
    });
    
    const dailyData: number[] = sortedBets.map(bet => bet.profit_loss || 0);
    
    this.profitLossChartData = {
      labels: dates,
      datasets: [
        {
          label: 'Cumulative Profit/Loss',
          data: cumulativeData,
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 3
        },
        {
          label: 'Daily Profit/Loss',
          data: dailyData,
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false
        }
      ]
    };
  }

  onDateChange(): void {
    if (this.selectedStartDate) {
      this.filterForm.get('timeFilter')?.setValue('custom');
      this.applyFilters();
    }
  }

  // Mobile View Methods
  filterByResult(result: string): void {
    this.activeResultFilter = result;
    this.applyFilters();
  }

  sortByDate(): void {
    this.filteredBets.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    this.updateDisplayedBets();
  }

  sortByProfit(): void {
    this.filteredBets.sort((a, b) => b.profit_loss - a.profit_loss);
    this.updateDisplayedBets();
  }

  sortByStake(): void {
    this.filteredBets.sort((a, b) => b.stake - a.stake);
    this.updateDisplayedBets();
  }

  getCampaignName(campaignId: number): string {
    const campaign = this.campaigns.find(c => c.id === campaignId);
    return campaign ? campaign.name : 'Unknown Campaign';
  }

  getCampaignInitial(campaignId: number): string {
    const campaign = this.campaigns.find(c => c.id === campaignId);
    return campaign ? campaign.name.charAt(0).toUpperCase() : '?';
  }

  getAverageBet(): number {
    if (this.filteredBets.length === 0) return 0;
    const totalStaked = this.filteredBets.reduce((sum, bet) => sum + bet.stake, 0);
    return totalStaked / this.filteredBets.length;
  }

  viewBetDetails(bet: Bet): void {
    console.log('View bet details:', bet);
    // Implement navigation: this.router.navigate(['/bets', bet.id]);
  }

  loadMoreBets(): void {
    this.isLoadingMore = true;
    
    setTimeout(() => {
      this.mobileCurrentPage++;
      this.updateDisplayedBets();
      this.isLoadingMore = false;
    }, 500);
  }

  updateDisplayedBets(): void {
    const endIndex = this.mobileCurrentPage * this.mobilePageSize;
    this.displayedBets = this.filteredBets.slice(0, endIndex);
    this.hasMoreBets = endIndex < this.filteredBets.length;
  }

  // Original helper methods
  getTotalCampaigns(): number {
    return this.campaigns.length;
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

  getTotalProfitLoss(): number {
    return this.stats.totalProfitLoss;
  }
}