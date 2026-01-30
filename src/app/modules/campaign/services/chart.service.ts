import { Injectable } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { CurrencyService } from './currency.service';

Chart.register(...registerables);

@Injectable({
  providedIn: 'root'
})
export class ChartService {
  
  constructor(private currencyService: CurrencyService) {}

  createBalanceChart(
    canvasId: string,
    labels: string[],
    data: number[]
  ): Chart {
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement;
    
    // Get current currency for formatting
    const currentCurrency = this.currencyService.getCurrentCurrency();
    
    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Balance Progress',
            data: data,
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#3498db',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
                const amount = context.parsed.y;
                // Handle null/undefined values
                if (amount === null || amount === undefined) {
                  return 'Balance: N/A';
                }
                const formattedAmount = this.currencyService.formatCurrency(amount);
                return `Balance: ${formattedAmount}`;
              }
            }
          }
        },
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
                // Handle string or number values safely
                if (typeof value === 'string') {
                  const numValue = parseFloat(value);
                  if (isNaN(numValue)) {
                    return this.currencyService.formatCurrency(0);
                  }
                  return this.currencyService.formatCurrency(numValue);
                }
                if (value === null || value === undefined) {
                  return this.currencyService.formatCurrency(0);
                }
                return this.currencyService.formatCurrency(value);
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
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    };

    return new Chart(ctx, config);
  }

  createPerformanceChart(canvasId: string, data: number[]): Chart {
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement;
    
    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Wins', 'Losses', 'Pending'],
        datasets: [{
          data: data,
          backgroundColor: [
            '#28a745',
            '#dc3545',
            '#ffc107'
          ],
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 15
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#2c3e50',
              font: {
                size: 12,
                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
              },
              padding: 20
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw;
                
                // Handle null/undefined values
                if (value === null || value === undefined) {
                  return `${label}: 0 (0%)`;
                }
                
                const dataset = context.dataset.data as (number | null)[];
                const validData = dataset.filter(v => v !== null) as number[];
                const total = validData.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((Number(value) / total) * 100) : 0;
                return `${label}: ${value} bet${value !== 1 ? 's' : ''} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '70%'
      }
    };

    return new Chart(ctx, config);
  }

  createProfitLossChart(
    canvasId: string,
    labels: string[],
    profits: number[],
    losses: number[]
  ): Chart {
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement;
    const currentCurrency = this.currencyService.getCurrentCurrency();
    
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Profits',
            data: profits,
            backgroundColor: 'rgba(40, 167, 69, 0.7)',
            borderColor: '#28a745',
            borderWidth: 1
          },
          {
            label: 'Losses',
            data: losses,
            backgroundColor: 'rgba(220, 53, 69, 0.7)',
            borderColor: '#dc3545',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.raw;
                
                // Handle null/undefined values
                if (value === null || value === undefined) {
                  return `${label}: ${this.currencyService.formatCurrency(0)}`;
                }
                
                return `${label}: ${this.currencyService.formatCurrency(Number(value))}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                // Handle string or number values safely
                if (typeof value === 'string') {
                  const numValue = parseFloat(value);
                  if (isNaN(numValue)) {
                    return this.currencyService.formatCurrency(0);
                  }
                  return this.currencyService.formatCurrency(numValue);
                }
                if (value === null || value === undefined) {
                  return this.currencyService.formatCurrency(0);
                }
                return this.currencyService.formatCurrency(value);
              }
            },
            title: {
              display: true,
              text: `Amount (${currentCurrency.code})`
            }
          }
        }
      }
    };

    return new Chart(ctx, config);
  }

  // Helper method to safely format chart values
  private safeFormatCurrency(value: unknown): string {
    if (value === null || value === undefined) {
      return this.currencyService.formatCurrency(0);
    }
    
    if (typeof value === 'string') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return this.currencyService.formatCurrency(0);
      }
      return this.currencyService.formatCurrency(numValue);
    }
    
    if (typeof value === 'number') {
      return this.currencyService.formatCurrency(value);
    }
    
    return this.currencyService.formatCurrency(0);
  }
}