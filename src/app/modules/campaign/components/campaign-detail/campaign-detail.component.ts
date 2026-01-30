import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CampaignService, Campaign } from '../../services/campaign.service';
import { TransactionService, Transaction } from '../../services/transaction.service';
import { BetService, Bet } from '../../services/bet.service';

@Component({
  selector: 'app-campaign-detail',
  templateUrl: './campaign-detail.component.html',
  styleUrls: ['./campaign-detail.component.scss']
})
export class CampaignDetailComponent implements OnInit {
  campaign?: Campaign;
  transactions: Transaction[] = [];
  bets: Bet[] = [];

  constructor(
    private route: ActivatedRoute,
    private campaignService: CampaignService,
    private transactionService: TransactionService,
    private betService: BetService
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadCampaign(id);
    this.loadTransactions(id);
    this.loadBets(id);
  }

  loadCampaign(id: number): void {
    this.campaignService.get(id).subscribe(c => this.campaign = c);
  }

  loadTransactions(campaignId: number): void {
    this.transactionService.getByCampaign(campaignId)
      .subscribe(t => this.transactions = t);
  }

  loadBets(campaignId: number): void {
    this.betService.getByCampaign(campaignId)
      .subscribe(b => this.bets = b);
  }

  onTransactionAdded(): void {
    if (this.campaign) {
      this.loadCampaign(this.campaign.id);
      this.loadTransactions(this.campaign.id);
    }
  }

  onBetPlaced(): void {
    if (this.campaign) {
      this.loadCampaign(this.campaign.id);
      this.loadBets(this.campaign.id);
    }
  }
}