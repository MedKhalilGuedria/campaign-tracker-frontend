import { Component, Input, OnInit, EventEmitter, Output } from '@angular/core';
import { BetService, Bet } from '../../services/bet.service';

@Component({
  selector: 'app-bet-list',
  templateUrl: './bet-list.component.html',
  styleUrls: ['./bet-list.component.scss']
})
export class BetListComponent implements OnInit {
  @Input() campaignId!: number;
  @Output() betPlaced = new EventEmitter<void>();
  
  bets: Bet[] = [];

  constructor(private service: BetService) { }

  ngOnInit(): void {
    this.loadBets();
  }

  loadBets(): void {
    this.service.getByCampaign(this.campaignId)
      .subscribe(b => this.bets = b);
  }

  onResultUpdated(updatedBet: Bet): void {
    this.service.updateResult(updatedBet.id, updatedBet.result, updatedBet.profit_loss)
      .subscribe({
        next: () => {
          this.loadBets();
          this.betPlaced.emit(); // Refresh parent component
        },
        error: (error) => {
          console.error('Error updating bet result:', error);
        }
      });
  }

  getWinCount(): number {
    return this.bets.filter(b => b.result === 'win').length;
  }

  getLossCount(): number {
    return this.bets.filter(b => b.result === 'loss').length;
  }

  getPendingCount(): number {
    return this.bets.filter(b => b.result === 'pending').length;
  }
}