import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgChartsModule } from 'ng2-charts';

import { CampaignListComponent } from './components/campaign-list/campaign-list.component';
import { CampaignCreateComponent } from './components/campaign-create/campaign-create.component';
import { CampaignDetailComponent } from './components/campaign-detail/campaign-detail.component';
import { BetListComponent } from './components/bet-list/bet-list.component';
import { BetCreateComponent } from './components/bet-create/bet-create.component';
import { TransactionListComponent } from './components/transaction-list/transaction-list.component';
import { TransactionCreateComponent } from './components/transaction-create/transaction-create.component';
import { BalanceChartComponent } from './components/balance-chart/balance-chart.component';
import { BetResultComponent } from './components/bet-result/bet-result.component';
import { CurrencySelectorComponent } from './components/currency-selector/currency-selector.component';
import { CurrencyFormatPipe } from './pipes/currency.pipe';

@NgModule({
  declarations: [
    CampaignListComponent,
    CampaignCreateComponent,
    CampaignDetailComponent,
    TransactionListComponent,
    TransactionCreateComponent,
    BetListComponent,
    BetCreateComponent,
    BalanceChartComponent,
    BetResultComponent,
    CurrencySelectorComponent,
    CurrencyFormatPipe
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgChartsModule
  ],
  exports: [
    CampaignListComponent,
    CampaignCreateComponent,
    CampaignDetailComponent,
    CurrencySelectorComponent,
    CurrencyFormatPipe
  ]
})
export class CampaignModule { }