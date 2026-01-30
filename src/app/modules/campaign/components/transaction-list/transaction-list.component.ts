import { Component, Input, OnInit } from '@angular/core';
import { TransactionService, Transaction } from '../../services/transaction.service';

@Component({
  selector: 'app-transaction-list',
  templateUrl: './transaction-list.component.html',
  styleUrls: ['./transaction-list.component.scss']
})
export class TransactionListComponent implements OnInit {

  @Input() campaignId!: number;
  transactions: Transaction[] = [];

  constructor(private service: TransactionService) { }

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.service.getByCampaign(this.campaignId)
      .subscribe(t => this.transactions = t);
  }

  onTransactionAdded(): void {
    this.loadTransactions();
  }
}