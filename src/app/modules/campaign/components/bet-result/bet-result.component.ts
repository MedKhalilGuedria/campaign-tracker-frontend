import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Bet } from '../../services/bet.service';

@Component({
  selector: 'app-bet-result',
  templateUrl: './bet-result.component.html',
  styleUrls: ['./bet-result.component.scss']
})
export class BetResultComponent {
  @Input() bet!: Bet;
  @Output() resultUpdated = new EventEmitter<Bet>();

  selectedResult: string = 'pending';
  profitLoss: number = 0;
  showForm: boolean = false;

  constructor() {}

  ngOnInit(): void {
    this.selectedResult = this.bet.result;
    this.profitLoss = this.bet.profit_loss || 0;
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
  }

  calculatePotentialProfit(): number {
    if (this.selectedResult === 'win') {
      return this.bet.stake * this.bet.odds - this.bet.stake;
    } else if (this.selectedResult === 'loss') {
      return -this.bet.stake;
    }
    return 0;
  }

  saveResult(): void {
    const updatedBet: Bet = {
      ...this.bet,
      result: this.selectedResult,
      profit_loss: this.selectedResult === 'pending' ? 0 : this.profitLoss
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