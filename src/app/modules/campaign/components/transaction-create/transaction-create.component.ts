import { Component, Input, EventEmitter, Output } from '@angular/core';
import { TransactionService } from '../../services/transaction.service';
import { CampaignService } from '../../services/campaign.service';
import { CurrencyService } from '../../services/currency.service'; // Add this

@Component({
  selector: 'app-transaction-create',
  templateUrl: './transaction-create.component.html',
  styleUrls: ['./transaction-create.component.scss']
})
export class TransactionCreateComponent {

  @Input() campaignId!: number;
  @Output() transactionAdded = new EventEmitter<void>();

  type: 'deposit' | 'withdrawal' = 'deposit';
  amount = 0;
  errorMessage = '';

  constructor(
    private transactionService: TransactionService,
    private campaignService: CampaignService,
    private currencyService: CurrencyService // Inject CurrencyService
  ) { }

  submit(): void {
    if (this.amount <= 0) {
      this.errorMessage = 'Amount must be greater than 0';
      return;
    }

    // Convert the amount from selected currency to USD for backend
    const amountInUSD = this.currencyService.saveAmount(this.amount);

    this.transactionService.create({
      campaign_id: this.campaignId,
      type: this.type,
      amount: amountInUSD // Send converted amount
    }).subscribe({
      next: () => {
        this.amount = 0;
        this.errorMessage = '';
        this.transactionAdded.emit();
        // Refresh campaign data
        this.campaignService.get(this.campaignId).subscribe();
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Error creating transaction';
      }
    });
  }
}