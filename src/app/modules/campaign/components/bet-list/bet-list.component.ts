import { Component, Input, OnInit, EventEmitter, Output, OnDestroy } from '@angular/core';
import { BetService, Bet } from '../../services/bet.service';
import { CampaignDateFilterService, DateFilter } from '../../services/campaign-date-filter.service';
import { Subscription } from 'rxjs';
import { CurrencyService } from '../../services/currency.service';

@Component({
  selector: 'app-bet-list',
  templateUrl: './bet-list.component.html',
  styleUrls: ['./bet-list.component.scss']
})
export class BetListComponent implements OnInit, OnDestroy {
  @Input() campaignId!: number;
  @Input() useFilteredData = true;
  @Output() betPlaced = new EventEmitter<void>();
  
  allBets: Bet[] = [];
  filteredBets: Bet[] = [];
  
  private subscriptions: Subscription[] = [];

  constructor(
    private service: BetService,
    private dateFilterService: CampaignDateFilterService,
    public currencyService: CurrencyService

  ) { }

  ngOnInit(): void {
    this.loadBets();
    
    if (this.useFilteredData) {
      this.subscriptions.push(
        this.dateFilterService.currentFilter$.subscribe(() => {
          this.applyFilter();
        })
      );
    }
  }
getBetRowClass(bet: Bet): string {
  if (bet.result === 'win') return 'table-success-light';
  if (bet.result === 'loss') return 'table-danger-light';
  if (bet.result === 'pending') return 'table-warning-light';
  return '';
}

getBetResultClass(bet: Bet): string {
  if (bet.result === 'win') return 'bg-success';
  if (bet.result === 'loss') return 'bg-danger';
  if (bet.result === 'pending') return 'bg-warning';
  return 'bg-secondary';
}

markAsWin(bet: Bet): void {
  const updatedBet: Bet = {
    ...bet,
    result: 'win',
    profit_loss: bet.stake * (bet.odds - 1)
  };
  this.onResultUpdated(updatedBet);
}

markAsLoss(bet: Bet): void {
  const updatedBet: Bet = {
    ...bet,
    result: 'loss',
    profit_loss: -bet.stake
  };
  this.onResultUpdated(updatedBet);
}
  loadBets(): void {
    this.service.getByCampaign(this.campaignId)
      .subscribe(b => {
        this.allBets = b;
        if (this.useFilteredData) {
          this.applyFilter();
        } else {
          this.filteredBets = [...b];
        }
      });
  }

  applyFilter(): void {
    const dateRange = this.dateFilterService.getDateRange();
    
    this.filteredBets = this.allBets.filter(b => {
      const betDate = new Date(b.created_at);
      return betDate >= dateRange.start && betDate <= dateRange.end;
    });
  }

  onResultUpdated(updatedBet: Bet): void {
    this.service.updateResult(updatedBet.id, updatedBet.result, updatedBet.profit_loss)
      .subscribe({
        next: () => {
          this.loadBets();
          this.betPlaced.emit();
        },
        error: (error) => {
          console.error('Error updating bet result:', error);
        }
      });
  }

  getWinCount(): number {
    return this.filteredBets.filter(b => b.result === 'win').length;
  }

  getLossCount(): number {
    return this.filteredBets.filter(b => b.result === 'loss').length;
  }

  getPendingCount(): number {
    return this.filteredBets.filter(b => b.result === 'pending').length;
  }

  getTotalStake(): number {
    return this.filteredBets.reduce((sum, b) => sum + b.stake, 0);
  }

  getTotalProfitLoss(): number {
    const settledBets = this.filteredBets.filter(b => b.result !== 'pending');
    return settledBets.reduce((sum, b) => sum + b.profit_loss, 0);
  }

  getWinRate(): number {
    const settledBets = this.filteredBets.filter(b => b.result !== 'pending');
    if (settledBets.length === 0) return 0;
    return (this.getWinCount() / settledBets.length) * 100;
  }

  getROI(): number {
    const totalStake = this.getTotalStake();
    if (totalStake === 0) return 0;
    return (this.getTotalProfitLoss() / totalStake) * 100;
  }

  getPerformanceBySport(): any[] {
    const betsBySport = this.filteredBets.reduce((acc, bet) => {
      if (!acc[bet.sport]) {
        acc[bet.sport] = { sport: bet.sport, wins: 0, losses: 0, pending: 0, profit: 0 };
      }
      acc[bet.sport][bet.result === 'pending' ? 'pending' : bet.result === 'win' ? 'wins' : 'losses']++;
      acc[bet.sport].profit += bet.profit_loss;
      return acc;
    }, {} as any);
    
    return Object.values(betsBySport);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}