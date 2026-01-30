import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { Transaction } from '../../services/transaction.service';
import { Bet } from '../../services/bet.service';
import { Campaign } from '../../services/campaign.service';
import { CurrencyService } from '../../services/currency.service';

@Component({
  selector: 'app-balance-chart',
  templateUrl: './balance-chart.component.html',
  styleUrls: ['./balance-chart.component.scss']
})
export class BalanceChartComponent implements OnInit, OnChanges {
  @Input() campaign!: Campaign;
  @Input() transactions: Transaction[] = [];
  @Input() bets: Bet[] = [];

  // Line Chart for Balance
  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  public lineChartOptions: ChartConfiguration<'line'>['options'];
  public lineChartLegend = true;

  // Doughnut Chart for Performance
  public doughnutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Wins', 'Losses', 'Pending'],
    datasets: []
  };

  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  public doughnutChartType = 'doughnut' as const;

  // Statistics
  performanceStats: any = {
    wins: 0,
    losses: 0,
    pending: 0,
    totalBets: 0,
    winRate: '0',
    totalStaked: 0,
    totalProfit: 0,
    avgOdds: '0.00'
  };

  transactionStats: any = {
    totalDeposits: 0,
    totalWithdrawals: 0,
    largestDeposit: 0,
    largestWithdrawal: 0,
    depositCount: 0,
    withdrawalCount: 0
  };

  // Make currencyService public for template
  constructor(public currencyService: CurrencyService) {
    this.initializeChartOptions();
  }

  ngOnInit(): void {
    this.updateCharts();
    
    // Listen for currency changes
    window.addEventListener('currencyChanged', () => {
      this.updateChartOptions();
      this.updateCharts();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['campaign'] || changes['transactions'] || changes['bets']) {
      this.updateCharts();
    }
  }

  // Initialize chart options with current currency
  private initializeChartOptions(): void {
    const currentCurrency = this.currencyService.getCurrentCurrency();
    
    this.lineChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            color: '#7f8c8d',
            font: {
              size: 12
            }
          },
          title: {
            display: true,
            text: 'Timeline',
            color: '#2c3e50',
            font: {
              size: 14,
              weight: 'bold' as const
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            color: '#7f8c8d',
            font: {
              size: 12
            },
            callback: (value) => {
              // Handle different value types safely
              const numValue = this.parseChartValue(value);
              return this.currencyService.formatCurrency(numValue);
            }
          },
          title: {
            display: true,
            text: `Balance (${currentCurrency.code})`,
            color: '#2c3e50',
            font: {
              size: 14,
              weight: 'bold' as const
            }
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#2c3e50',
            font: {
              size: 14,
              family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(44, 62, 80, 0.9)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#3498db',
          borderWidth: 1,
          cornerRadius: 8,
          callbacks: {
            label: (context) => {
              // Use bracket notation to access 'y' property
              const amount = context.parsed['y'] as number;
              const numValue = this.parseChartValue(amount);
              return `Balance: ${this.currencyService.formatCurrency(numValue)}`;
            }
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    };
  }

  // Update chart options when currency changes
  private updateChartOptions(): void {
    const currentCurrency = this.currencyService.getCurrentCurrency();
    
    // Get current options
    const currentOptions = this.lineChartOptions || {};
    
    // Create new options object with bracket notation for scales
    this.lineChartOptions = {
      ...currentOptions,
      scales: {
        ...currentOptions.scales,
        x: currentOptions.scales?.['x'],
        y: {
          ...currentOptions.scales?.['y'],
          title: {
            display: true,
            text: `Balance (${currentCurrency.code})`,
            color: '#2c3e50',
            font: {
              size: 14,
              weight: 'bold' as const
            }
          },
          ticks: {
            ...currentOptions.scales?.['y']?.['ticks'],
            callback: (value) => {
              const numValue = this.parseChartValue(value);
              return this.currencyService.formatCurrency(numValue);
            }
          }
        }
      },
      plugins: {
        ...currentOptions.plugins,
        tooltip: {
          ...currentOptions.plugins?.['tooltip'],
          callbacks: {
            label: (context) => {
              // Use bracket notation
              const amount = context.parsed['y'] as number;
              const numValue = this.parseChartValue(amount);
              return `Balance: ${this.currencyService.formatCurrency(numValue)}`;
            }
          }
        }
      }
    };
  }

  // Helper to parse chart values safely
  private parseChartValue(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }
    
    if (typeof value === 'string') {
      const numValue = parseFloat(value);
      return isNaN(numValue) ? 0 : numValue;
    }
    
    if (typeof value === 'number') {
      return value;
    }
    
    return 0;
  }

  updateCharts(): void {
    if (!this.campaign) return;

    this.updateBalanceChart();
    this.updatePerformanceChart();
    this.calculateStats();
  }

  updateBalanceChart(): void {
    const timeline: string[] = ['Start'];
    const balances: number[] = [this.campaign.start_balance];
    
    let currentBalance = this.campaign.start_balance;
    
    // Add transaction points
    this.transactions.forEach((transaction, index) => {
      if (transaction.type === 'deposit') {
        currentBalance += transaction.amount;
      } else if (transaction.type === 'withdrawal') {
        currentBalance -= transaction.amount;
      }
      
      timeline.push(`T${index + 1}`);
      balances.push(currentBalance);
    });
    
    // Add bet points
    this.bets.forEach((bet, index) => {
      currentBalance -= bet.stake;
      timeline.push(`B${index + 1}`);
      balances.push(currentBalance);
    });
    
    // Add current balance
    if (timeline[timeline.length - 1] !== 'Current') {
      timeline.push('Current');
      balances.push(this.campaign.current_balance);
    }

    this.lineChartData = {
      labels: timeline,
      datasets: [
        {
          data: balances,
          label: 'Balance Progress',
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#3498db',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8
        }
      ]
    };
  }

  updatePerformanceChart(): void {
    const wins = this.bets.filter(b => b.result === 'win').length;
    const losses = this.bets.filter(b => b.result === 'loss').length;
    const pending = this.bets.filter(b => b.result === 'pending').length;

    this.doughnutChartData = {
      labels: ['Wins', 'Losses', 'Pending'],
      datasets: [
        {
          data: [wins, losses, pending],
          backgroundColor: ['#28a745', '#dc3545', '#ffc107'],
          hoverBackgroundColor: ['#218838', '#c82333', '#e0a800'],
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 15
        }
      ]
    };
  }

  calculateStats(): void {
    // Performance Stats
    const wins = this.bets.filter(b => b.result === 'win').length;
    const losses = this.bets.filter(b => b.result === 'loss').length;
    const pending = this.bets.filter(b => b.result === 'pending').length;
    const totalBets = this.bets.length;
    
    const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : '0';
    
    let totalStaked = 0;
    this.bets.forEach(bet => {
      totalStaked += bet.stake || 0;
    });
    
    let totalProfit = 0;
    this.bets.forEach(bet => {
      totalProfit += bet.profit_loss || 0;
    });
    
    let totalOdds = 0;
    this.bets.forEach(bet => {
      totalOdds += bet.odds || 0;
    });
    
    const avgOdds = totalBets > 0 ? (totalOdds / totalBets).toFixed(2) : '0.00';

    this.performanceStats = {
      wins,
      losses,
      pending,
      totalBets,
      winRate,
      totalStaked,
      totalProfit,
      avgOdds
    };

    // Transaction Stats
    const deposits = this.transactions.filter(t => t.type === 'deposit');
    const withdrawals = this.transactions.filter(t => t.type === 'withdrawal');
    
    let totalDeposits = 0;
    deposits.forEach(t => {
      totalDeposits += t.amount || 0;
    });
    
    let totalWithdrawals = 0;
    withdrawals.forEach(t => {
      totalWithdrawals += t.amount || 0;
    });
    
    const depositAmounts = deposits.map(t => t.amount || 0);
    const withdrawalAmounts = withdrawals.map(t => t.amount || 0);
    
    this.transactionStats = {
      totalDeposits,
      totalWithdrawals,
      largestDeposit: depositAmounts.length > 0 ? Math.max(...depositAmounts) : 0,
      largestWithdrawal: withdrawalAmounts.length > 0 ? Math.max(...withdrawalAmounts) : 0,
      depositCount: deposits.length,
      withdrawalCount: withdrawals.length
    };
  }
}