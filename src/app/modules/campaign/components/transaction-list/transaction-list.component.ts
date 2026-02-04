import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { TransactionService, Transaction } from '../../services/transaction.service';
import { CampaignDateFilterService, DateFilter } from '../../services/campaign-date-filter.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-transaction-list',
  templateUrl: './transaction-list.component.html',
  styleUrls: ['./transaction-list.component.scss']
})
export class TransactionListComponent implements OnInit, OnDestroy {
  @Input() campaignId!: number;
  @Input() useFilteredData = true;
  
  allTransactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  
  private subscriptions: Subscription[] = [];

  constructor(
    private service: TransactionService,
    private dateFilterService: CampaignDateFilterService
  ) { }

  ngOnInit(): void {
    this.loadTransactions();
    
    if (this.useFilteredData) {
      this.subscriptions.push(
        this.dateFilterService.currentFilter$.subscribe(() => {
          this.applyFilter();
        })
      );
    }
  }

  loadTransactions(): void {
    this.service.getByCampaign(this.campaignId)
      .subscribe(t => {
        this.allTransactions = t;
        if (this.useFilteredData) {
          this.applyFilter();
        } else {
          this.filteredTransactions = [...t];
        }
      });
  }

  applyFilter(): void {
    const dateRange = this.dateFilterService.getDateRange();
    
    this.filteredTransactions = this.allTransactions.filter(t => {
      const transDate = new Date(t.created_at);
      return transDate >= dateRange.start && transDate <= dateRange.end;
    });
  }

  onTransactionAdded(): void {
    this.loadTransactions();
  }

  getTotalDeposits(): number {
    return this.filteredTransactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getTotalWithdrawals(): number {
    return this.filteredTransactions
      .filter(t => t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getNetTransactions(): number {
    return this.getTotalDeposits() - this.getTotalWithdrawals();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}