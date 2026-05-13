import { Component, Input, OnChanges, SimpleChanges, OnDestroy, OnInit } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { Bet } from '../../services/bet.service';
import { Transaction } from '../../services/transaction.service';
import { Campaign } from '../../services/campaign.service';
import { CurrencyService } from '../../services/currency.service';
import { CampaignDateFilterService } from '../../services/campaign-date-filter.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profit-loss-chart',
  templateUrl: './profit-loss-chart.component.html',
  styleUrls: ['./profit-loss-chart.component.scss']
})
export class ProfitLossChartComponent implements OnInit, OnChanges, OnDestroy {
  @Input() campaign!: Campaign;
  @Input() bets: Bet[] = [];
  @Input() transactions: Transaction[] = [];
  @Input() useFilteredData = false;

  // Line Chart for Cumulative Profit/Loss
  public cumulativeChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  // Bar Chart for Daily P/L
  public dailyChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  // Donut Chart for Win/Loss Distribution
  public winLossChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Wins', 'Losses', 'Pending'],
    datasets: []
  };

  public cumulativeChartOptions: ChartConfiguration<'line'>['options'];
  public dailyChartOptions: ChartConfiguration<'bar'>['options'];
  public winLossChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { size: 12 }
        }
      }
    }
  };

  // Statistics
  public profitStats = {
    totalProfitLoss: 0,
    cumulativeProfitLoss: 0,
    bestDay: { date: '', profit: 0 },
    worstDay: { date: '', profit: 0 },
    winningDays: 0,
    losingDays: 0,
    averageDailyProfit: 0,
    totalWinningBets: 0,
    totalLosingBets: 0,
    winRate: 0,
    biggestWin: 0,
    biggestLoss: 0,
    totalStake: 0,
    roi: 0
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
      this.initializeChartOptions();
      this.updateCharts();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bets'] || changes['transactions']) {
      this.updateCharts();
    }
  }

  private initializeChartOptions(): void {
    const currentCurrency = this.currencyService.getCurrentCurrency();

    // Cumulative P/L Line Chart Options
    this.cumulativeChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: { 
            color: '#7f8c8d', 
            font: { size: 11 },
            maxRotation: 45,
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: 10
          },
          title: {
            display: true,
            text: 'Bet Sequence',
            color: '#2c3e50',
            font: { size: 13, weight: 'bold' as const }
          }
        },
        y: {
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: {
            color: '#7f8c8d',
            font: { size: 11 },
            callback: (value) => {
              const numValue = this.parseChartValue(value);
              return this.currencyService.formatCurrency(numValue);
            }
          },
          title: {
            display: true,
            text: `Cumulative Profit/Loss (${currentCurrency.code})`,
            color: '#2c3e50',
            font: { size: 13, weight: 'bold' as const }
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#2c3e50',
            font: { size: 12 }
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
              const label = context.dataset.label || '';
              return `${label}: ${this.currencyService.formatCurrency(numValue)}`;
            }
          }
        }
      },
      interaction: { intersect: false, mode: 'index' }
    };

    // Daily P/L Bar Chart Options
    this.dailyChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: { 
            color: '#7f8c8d', 
            font: { size: 11 },
            maxRotation: 45,
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: 10
          },
          title: {
            display: true,
            text: 'Date',
            color: '#2c3e50',
            font: { size: 13, weight: 'bold' as const }
          }
        },
        y: {
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: {
            color: '#7f8c8d',
            font: { size: 11 },
            callback: (value) => {
              const numValue = this.parseChartValue(value);
              return this.currencyService.formatCurrency(numValue);
            }
          },
          title: {
            display: true,
            text: `Daily Profit/Loss (${currentCurrency.code})`,
            color: '#2c3e50',
            font: { size: 13, weight: 'bold' as const }
          }
        }
      },
      plugins: {
        legend: { display: false },
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
              const sign = numValue >= 0 ? '+' : '';
              return `P/L: ${sign}${this.currencyService.formatCurrency(numValue)}`;
            }
          }
        }
      }
    };
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

    this.updateCumulativeProfitLossChart();
    this.updateDailyProfitLossChart();
    this.updateWinLossChart();
    this.calculateStats();
  }

  updateCumulativeProfitLossChart(): void {
    // Filter settled bets only
    const settledBets = this.bets.filter(b => b.result !== 'pending');
    
    if (settledBets.length === 0) {
      this.cumulativeChartData = {
        labels: [],
        datasets: [{
          data: [],
          label: 'Cumulative Profit/Loss',
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: [],
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8
        }]
      };
      return;
    }

    // Sort bets by date
    const sortedBets = [...settledBets].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Calculate cumulative P/L
    let cumulative = 0;
    const labels: string[] = [];
    const cumulativeData: number[] = [];
    const pointColors: string[] = [];

    sortedBets.forEach((bet, index) => {
      cumulative += bet.profit_loss;
      const date = new Date(bet.created_at);
      const label = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
      
      labels.push(label);
      cumulativeData.push(cumulative);
      pointColors.push(cumulative >= 0 ? '#28a745' : '#dc3545');
    });

    this.cumulativeChartData = {
      labels: labels,
      datasets: [
        {
          data: cumulativeData,
          label: 'Cumulative Profit/Loss',
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: pointColors,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8
        }
      ]
    };
  }

  updateDailyProfitLossChart(): void {
    // Group settled bets by date
    const dailyData: { [key: string]: { profitLoss: number, date: Date, betCount: number } } = {};
    
    const settledBets = this.bets.filter(b => b.result !== 'pending');
    
    settledBets.forEach(bet => {
      const date = new Date(bet.created_at);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { profitLoss: 0, date, betCount: 0 };
      }
      dailyData[dateKey].profitLoss += bet.profit_loss;
      dailyData[dateKey].betCount += 1;
    });
    
    // Sort dates and prepare chart data
    const sortedDates = Object.keys(dailyData).sort();
    const labels = sortedDates.map(date => {
      const d = new Date(date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    
    const profitLossData = sortedDates.map(date => dailyData[date].profitLoss);

    this.dailyChartData = {
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
          borderWidth: 2,
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.8
        }
      ]
    };
  }

  updateWinLossChart(): void {
    const wins = this.bets.filter(b => b.result === 'win').length;
    const losses = this.bets.filter(b => b.result === 'loss').length;
    const pending = this.bets.filter(b => b.result === 'pending').length;

    this.winLossChartData = {
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
    const settledBets = this.bets.filter(b => b.result !== 'pending');
    const wins = settledBets.filter(b => b.result === 'win');
    const losses = settledBets.filter(b => b.result === 'loss');
    
    // Total P/L
    this.profitStats.totalProfitLoss = settledBets.reduce((sum, b) => sum + b.profit_loss, 0);
    this.profitStats.totalWinningBets = wins.length;
    this.profitStats.totalLosingBets = losses.length;
    this.profitStats.winRate = settledBets.length > 0 ? (wins.length / settledBets.length) * 100 : 0;
    
    // Biggest win/loss
    this.profitStats.biggestWin = wins.length > 0 ? Math.max(...wins.map(w => w.profit_loss)) : 0;
    this.profitStats.biggestLoss = losses.length > 0 ? Math.min(...losses.map(l => l.profit_loss)) : 0;
    
    // Total stake and ROI
    this.profitStats.totalStake = settledBets.reduce((sum, b) => sum + b.stake, 0);
    this.profitStats.roi = this.profitStats.totalStake > 0 
      ? (this.profitStats.totalProfitLoss / this.profitStats.totalStake) * 100 
      : 0;
    
    // Group by day for daily stats
    const dailyData: { [key: string]: { profitLoss: number, date: Date } } = {};
    settledBets.forEach(bet => {
      const dateKey = new Date(bet.created_at).toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { profitLoss: 0, date: new Date(bet.created_at) };
      }
      dailyData[dateKey].profitLoss += bet.profit_loss;
    });
    
    const dailyValues = Object.values(dailyData);
    
    // Best and worst day
    let bestDay = { date: '', profit: -Infinity };
    let worstDay = { date: '', profit: Infinity };
    let totalDailyProfit = 0;
    let winningDays = 0;
    let losingDays = 0;
    
    dailyValues.forEach(day => {
      totalDailyProfit += day.profitLoss;
      if (day.profitLoss > bestDay.profit) {
        bestDay = { date: day.date.toISOString().split('T')[0], profit: day.profitLoss };
      }
      if (day.profitLoss < worstDay.profit) {
        worstDay = { date: day.date.toISOString().split('T')[0], profit: day.profitLoss };
      }
      if (day.profitLoss > 0) winningDays++;
      if (day.profitLoss < 0) losingDays++;
    });
    
    this.profitStats.bestDay = bestDay.profit !== -Infinity ? bestDay : { date: '', profit: 0 };
    this.profitStats.worstDay = worstDay.profit !== Infinity ? worstDay : { date: '', profit: 0 };
    this.profitStats.winningDays = winningDays;
    this.profitStats.losingDays = losingDays;
    this.profitStats.averageDailyProfit = dailyValues.length > 0 ? totalDailyProfit / dailyValues.length : 0;
    
    // Cumulative profit
    let cumulative = 0;
    const sortedBets = [...settledBets].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    if (sortedBets.length > 0) {
      cumulative = sortedBets.reduce((sum, bet) => sum + bet.profit_loss, 0);
    }
    this.profitStats.cumulativeProfitLoss = cumulative;
  }
getPendingBetsCount(): number {
  return this.bets.filter(b => b.result === 'pending').length;
}
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    window.removeEventListener('currencyChanged', () => {});
  }
}