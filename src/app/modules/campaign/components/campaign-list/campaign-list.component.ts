import { Component, OnInit } from '@angular/core';
import { CampaignService, Campaign } from '../../services/campaign.service';
import { BetService, Bet } from '../../services/bet.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ChartConfiguration } from 'chart.js';
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
      beginAtZero: true,
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

// Add this method to calculate profit/loss over time
updateProfitLossChart(): void {
  if (this.filteredBets.length === 0) return;
  
  // Group bets by date and calculate cumulative profit/loss
  const betsByDate: { [key: string]: number } = {};
  
  // First, sort bets by date
  const sortedBets = [...this.filteredBets].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  // Calculate cumulative profit/loss
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
  
  // Also add daily profit/loss
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
  campaigns: Campaign[] = [];
  allBets: Bet[] = [];
  filteredBets: Bet[] = [];
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
    
    // Watch for filter changes
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
    // Assuming you have a method to get all bets across campaigns
    this.betService.getAllBets().subscribe(bets => {
      this.allBets = bets;
      this.applyFilters();
    });
  }

  getCampaignName(campaignId: number): string {
  const campaign = this.campaigns.find(c => c.id === campaignId);
  return campaign ? campaign.name : 'Unknown Campaign';
}

  applyFilters(): void {
  let filtered = [...this.allBets];
  const timeFilter = this.filterForm.get('timeFilter')?.value || 'all';
  const nameFilter = this.filterForm.get('nameFilter')?.value || 'all';

  // Apply time filter
  if (timeFilter !== 'all') {
    if (timeFilter === 'custom') {
      // Custom date range
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
      // Predefined ranges
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

  this.filteredBets = filtered;
  this.calculateStats();
  this.updateProfitLossChart(); // Add this line
}

  calculateStats(): void {
    const allBets = this.filteredBets.length > 0 ? this.filteredBets : this.allBets;
    
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

  setCustomDateRange(): void {
    this.showDatePicker = false;
    this.filterForm.get('timeFilter')?.setValue('custom');
    this.applyFilters();
  }

  // Helper methods for statistics (keeping existing ones)
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