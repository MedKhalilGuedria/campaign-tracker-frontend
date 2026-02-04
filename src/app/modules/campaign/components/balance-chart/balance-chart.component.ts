import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { Transaction } from '../../services/transaction.service';
import { Bet } from '../../services/bet.service';
import { Campaign } from '../../services/campaign.service';
import { CurrencyService } from '../../services/currency.service';
import { CampaignDateFilterService } from '../../services/campaign-date-filter.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-balance-chart',
  templateUrl: './balance-chart.component.html',
  styleUrls: ['./balance-chart.component.scss']
})
export class BalanceChartComponent implements OnInit, OnChanges, OnDestroy {
  @Input() campaign!: Campaign;
  @Input() transactions: Transaction[] = [];
  @Input() bets: Bet[] = [];
  @Input() useFilteredData = false;

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

  // Bar Chart for Daily Profit/Loss
  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Profit/Loss'
        }
      }
    }
  };

  // Statistics
  performanceStats: any = {
    wins: 0,
    losses: 0,
    pending: 0,
    totalBets: 0,
    winRate: '0',
    totalStaked: 0,
    totalProfit: 0,
    avgOdds: '0.00',
    bestDay: { date: '', profit: 0 },
    worstDay: { date: '', profit: 0 }
  };

  transactionStats: any = {
    totalDeposits: 0,
    totalWithdrawals: 0,
    largestDeposit: 0,
    largestWithdrawal: 0,
    depositCount: 0,
    withdrawalCount: 0,
    bestDay: { date: '', net: 0 },
    worstDay: { date: '', net: 0 }
  };

  private subscriptions: Subscription[] = [];

  constructor(
    public currencyService: CurrencyService,
    private dateFilterService: CampaignDateFilterService
  ) {
    this.initializeChartOptions();
  }

  ngOnInit(): void {
    if (this.useFilteredData) {
      this.subscriptions.push(
        this.dateFilterService.currentFilter$.subscribe(() => {
          this.updateCharts();
        })
      );
    }
    
    this.updateCharts();
    
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

    this.barChartOptions = {
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
            text: 'Date',
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
              const numValue = this.parseChartValue(value);
              return this.currencyService.formatCurrency(numValue);
            }
          },
          title: {
            display: true,
            text: `Profit/Loss (${currentCurrency.code})`,
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
          position: 'top'
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
              const amount = context.parsed['y'] as number;
              const numValue = this.parseChartValue(amount);
              const label = context.dataset.label || '';
              return `${label}: ${this.currencyService.formatCurrency(numValue)}`;
            }
          }
        }
      }
    };
  }

  private updateChartOptions(): void {
    const currentCurrency = this.currencyService.getCurrentCurrency();
    
    if (this.lineChartOptions && this.lineChartOptions.scales) {
      this.lineChartOptions = {
        ...this.lineChartOptions,
        scales: {
          ...this.lineChartOptions.scales,
          y: {
            ...this.lineChartOptions.scales?.['y'],
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
        }
      };
    }

    if (this.barChartOptions && this.barChartOptions.scales) {
      this.barChartOptions = {
        ...this.barChartOptions,
        scales: {
          ...this.barChartOptions.scales,
          y: {
            ...this.barChartOptions.scales?.['y'],
            title: {
              display: true,
              text: `Profit/Loss (${currentCurrency.code})`,
              color: '#2c3e50',
              font: {
                size: 14,
                weight: 'bold' as const
              }
            }
          }
        }
      };
    }
  }

  private parseChartValue(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') {
      const numValue = parseFloat(value);
      return isNaN(numValue) ? 0 : numValue;
    }
    if (typeof value === 'number') return value;
    return 0;
  }

  updateCharts(): void {
    if (!this.campaign) return;

    this.updateBalanceChart();
    this.updatePerformanceChart();
    this.updateDailyProfitLossChart();
    this.calculateStats();
  }

  updateBalanceChart(): void {
    const timeline: string[] = ['Start'];
    const balances: number[] = [this.campaign.start_balance];
    
    let currentBalance = this.campaign.start_balance;
    
    // Combine and sort all events by date
    const allEvents = [
      ...this.transactions.map(t => ({
        date: new Date(t.created_at),
        type: 'transaction',
        data: t,
        change: t.type === 'deposit' ? t.amount : -t.amount
      })),
      ...this.bets.map(b => ({
        date: new Date(b.created_at),
        type: 'bet',
        data: b,
        change: -b.stake
      }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Add events to timeline
    allEvents.forEach((event, index) => {
      currentBalance += event.change;
      timeline.push(`Event ${index + 1}`);
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

  updateDailyProfitLossChart(): void {
    // Group bets by date
    const dailyData: { [key: string]: { profitLoss: number, date: Date } } = {};
    
    this.bets.forEach(bet => {
      const date = new Date(bet.created_at);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { profitLoss: 0, date };
      }
      dailyData[dateKey].profitLoss += bet.profit_loss;
    });
    
    // Sort dates and prepare chart data
    const sortedDates = Object.keys(dailyData).sort();
    const labels = sortedDates.map(date => {
      const d = new Date(date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    
    const profitLossData = sortedDates.map(date => dailyData[date].profitLoss);

    this.barChartData = {
      labels: labels,
      datasets: [
        {
          data: profitLossData,
          label: 'Daily Profit/Loss',
          backgroundColor: profitLossData.map(value => 
            value >= 0 ? 'rgba(40, 167, 69, 0.7)' : 'rgba(220, 53, 69, 0.7)'
          ),
          borderColor: profitLossData.map(value => 
            value >= 0 ? '#28a745' : '#dc3545'
          ),
          borderWidth: 1
        }
      ]
    };
  }

  calculateStats(): void {
    // Betting Stats
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

    // Find best and worst day for betting
    const dailyBetProfit: { [key: string]: number } = {};
    this.bets.forEach(bet => {
      const dateKey = new Date(bet.created_at).toISOString().split('T')[0];
      dailyBetProfit[dateKey] = (dailyBetProfit[dateKey] || 0) + (bet.profit_loss || 0);
    });
    
    let bestBetDay = { date: '', profit: 0 };
    let worstBetDay = { date: '', profit: 0 };
    Object.entries(dailyBetProfit).forEach(([date, profit]) => {
      if (profit > bestBetDay.profit) bestBetDay = { date, profit };
      if (profit < worstBetDay.profit) worstBetDay = { date, profit };
    });

    this.performanceStats = {
      wins,
      losses,
      pending,
      totalBets,
      winRate,
      totalStaked,
      totalProfit,
      avgOdds,
      bestDay: bestBetDay,
      worstDay: worstBetDay
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
    
    // Find best and worst day for transactions
    const dailyTransactionNet: { [key: string]: number } = {};
    this.transactions.forEach(transaction => {
      const dateKey = new Date(transaction.created_at).toISOString().split('T')[0];
      const change = transaction.type === 'deposit' ? transaction.amount : -transaction.amount;
      dailyTransactionNet[dateKey] = (dailyTransactionNet[dateKey] || 0) + change;
    });
    
    let bestTransDay = { date: '', net: 0 };
    let worstTransDay = { date: '', net: 0 };
    Object.entries(dailyTransactionNet).forEach(([date, net]) => {
      if (net > bestTransDay.net) bestTransDay = { date, net };
      if (net < worstTransDay.net) worstTransDay = { date, net };
    });

    this.transactionStats = {
      totalDeposits,
      totalWithdrawals,
      largestDeposit: depositAmounts.length > 0 ? Math.max(...depositAmounts) : 0,
      largestWithdrawal: withdrawalAmounts.length > 0 ? Math.max(...withdrawalAmounts) : 0,
      depositCount: deposits.length,
      withdrawalCount: withdrawals.length,
      bestDay: bestTransDay,
      worstDay: worstTransDay
    };
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    window.removeEventListener('currencyChanged', () => {});
  }
}