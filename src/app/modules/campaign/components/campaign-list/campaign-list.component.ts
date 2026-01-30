import { Component, OnInit } from '@angular/core';
import { CampaignService, Campaign } from '../../services/campaign.service';

@Component({
  selector: 'app-campaign-list',
  templateUrl: './campaign-list.component.html',
  styleUrls: ['./campaign-list.component.scss']
})
export class CampaignListComponent implements OnInit {
  campaigns: Campaign[] = [];

  constructor(private service: CampaignService) { }

  ngOnInit(): void {
    this.loadCampaigns();
  }

  loadCampaigns(): void {
    this.service.getAll().subscribe(data => this.campaigns = data);
  }

  // Helper methods for statistics
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
}