import { Component, Input, EventEmitter, Output } from '@angular/core';
import { BetService } from '../../services/bet.service';
import { CampaignService } from '../../services/campaign.service';
import { CurrencyService } from '../../services/currency.service'; // Add this

@Component({
  selector: 'app-bet-create',
  templateUrl: './bet-create.component.html',
  styleUrls: ['./bet-create.component.scss']
})
export class BetCreateComponent {

  @Input() campaignId!: number;
  @Input() currentBalance!: number;
  @Output() betPlaced = new EventEmitter<void>();

  sport = '';
  odds = 0;
  errorMessage = '';

  constructor(
    private betService: BetService,
    private campaignService: CampaignService,
    public currencyService: CurrencyService // Inject CurrencyService
  ) { }

  submit(): void {
    if (this.currentBalance <= 0) {
      this.errorMessage = 'No balance available to place bet';
      return;
    }

    if (!this.sport.trim()) {
      this.errorMessage = 'Sport is required';
      return;
    }

    if (this.odds <= 1) {
      this.errorMessage = 'Odds must be greater than 1';
      return;
    }

    this.betService.create({
      campaign_id: this.campaignId,
      sport: this.sport,
      odds: this.odds
    }).subscribe({
      next: () => {
        this.sport = '';
        this.odds = 0;
        this.errorMessage = '';
        this.betPlaced.emit();
        // Refresh campaign data
        this.campaignService.get(this.campaignId).subscribe();
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Error placing bet';
      }
    });
  }

  get potentialWin(): number {
    // Convert current balance from USD to selected currency for display
    const currentBalanceInSelectedCurrency = this.currencyService.displayAmount(this.currentBalance);
    return currentBalanceInSelectedCurrency * this.odds;
  }
}