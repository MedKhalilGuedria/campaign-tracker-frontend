import { Component, OnInit } from '@angular/core';
import { CampaignService, Campaign } from '../../services/campaign.service';
import { BetService, Bet } from '../../services/bet.service';
import { FormBuilder, FormGroup } from '@angular/forms';

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
    private fb: FormBuilder
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
    const timeFilter = this.filterForm.get('timeFilter')?.value;
    const nameFilter = this.filterForm.get('nameFilter')?.value;

    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (timeFilter) {
        case '30':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90':
          startDate.setDate(now.getDate() - 90);
          break;
        case 'custom':
          if (this.selectedStartDate && this.selectedEndDate) {
            startDate = this.selectedStartDate;
          }
          break;
      }
      
      if (timeFilter !== 'custom' || this.selectedStartDate) {
        filtered = filtered.filter(bet => 
          new Date(bet.created_at) >= startDate
        );
      }
      
      if (timeFilter === 'custom' && this.selectedEndDate) {
        filtered = filtered.filter(bet => 
          new Date(bet.created_at) <= this.selectedEndDate!
        );
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
        
        if (nameFilter === 'contains') {
          return campaign.name.includes('campaign');
        } else {
          return !campaign.name.includes('campaign');
        }
      });
    }

    this.filteredBets = filtered;
    this.calculateStats();
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