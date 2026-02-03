// bet-create.component.ts
import { Component, Input, EventEmitter, Output } from '@angular/core';
import { BetService } from '../../services/bet.service';
import { CampaignService } from '../../services/campaign.service';
import { CurrencyService } from '../../services/currency.service';

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
  stake: number | null = null; // Null means "use all balance"
  useFullBalance = true; // Checkbox state
  errorMessage = '';

  constructor(
    private betService: BetService,
    private campaignService: CampaignService,
    public currencyService: CurrencyService
  ) { }

  submit(): void {
    const availableBalance = this.currencyService.displayAmount(this.currentBalance);
    
    // Validation
    if (availableBalance <= 0) {
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

    // Calculate stake
    let stakeToSend: number | null = null;
    if (!this.useFullBalance) {
      if (!this.stake || this.stake <= 0) {
        this.errorMessage = 'Stake must be greater than 0';
        return;
      }
      if (this.stake > availableBalance) {
        this.errorMessage = `Stake exceeds available balance of ${availableBalance }`;
        return;
      }
      // Convert stake back to USD for API
      stakeToSend = this.currencyService.convertToUSD(this.stake);
    }

    this.betService.create({
      campaign_id: this.campaignId,
      sport: this.sport,
      odds: this.odds,
      stake: stakeToSend
    }).subscribe({
      next: () => {
        this.resetForm();
        this.betPlaced.emit();
        this.campaignService.get(this.campaignId).subscribe();
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Error placing bet';
      }
    });
  }

  resetForm(): void {
    this.sport = '';
    this.odds = 0;
    this.stake = null;
    this.useFullBalance = true;
    this.errorMessage = '';
  }

  toggleUseFullBalance(): void {
    this.useFullBalance = !this.useFullBalance;
    if (this.useFullBalance) {
      this.stake = null;
    } else {
      // Set stake to current balance by default when switching to custom stake
      this.stake = this.currencyService.displayAmount(this.currentBalance);
    }
  }

  get potentialWin(): number {
    const stakeAmount = this.calculateStake();
    return stakeAmount * this.odds;
  }

  calculateStake(): number {
    if (this.useFullBalance) {
      return this.currencyService.displayAmount(this.currentBalance);
    } else {
      return this.stake || 0;
    }
  }

  get remainingBalance(): number {
    const stakeAmount = this.calculateStake();
    return this.currencyService.displayAmount(this.currentBalance) - stakeAmount;
  }
}