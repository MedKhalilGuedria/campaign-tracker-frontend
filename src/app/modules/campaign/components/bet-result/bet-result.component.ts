import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Bet } from '../../services/bet.service';
import { CurrencyService } from '../../services/currency.service';

@Component({
  selector: 'app-bet-result',
  templateUrl: './bet-result.component.html',
  styleUrls: ['./bet-result.component.scss']
})
export class BetResultComponent implements OnInit {
  @Input() bet!: Bet;
  @Output() resultUpdated = new EventEmitter<Bet>();

  selectedResult: string = 'pending';

  // 👇 THIS VALUE IS ALWAYS IN CURRENT CURRENCY
  profitLoss: number = 0;

  showForm = false;

  constructor(private currencyService: CurrencyService) {}

  ngOnInit(): void {
    this.selectedResult = this.bet.result;

    // ✅ convert USD → current currency for input
    this.profitLoss = this.currencyService.displayAmount(
      this.bet.profit_loss || 0
    );
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
  }

  calculatePotentialProfit(): number {
    if (this.selectedResult === 'win') {
      return this.bet.stake * this.bet.odds - this.bet.stake;
    }
    if (this.selectedResult === 'loss') {
      return -this.bet.stake;
    }
    return 0;
  }

  saveResult(): void {
    // ✅ convert current currency → USD before saving
    const profitLossUSD =
      this.selectedResult === 'pending'
        ? 0
        : this.currencyService.saveAmount(this.profitLoss);

    const updatedBet: Bet = {
      ...this.bet,
      result: this.selectedResult,
      profit_loss: profitLossUSD
    };

    this.resultUpdated.emit(updatedBet);
    this.showForm = false;
  }

  getResultClass(result: string): string {
    switch (result) {
      case 'win': return 'success';
      case 'loss': return 'danger';
      case 'pending': return 'warning';
      default: return 'secondary';
    }
  }
}
