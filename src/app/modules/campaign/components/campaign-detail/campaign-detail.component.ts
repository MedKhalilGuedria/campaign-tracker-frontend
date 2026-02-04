import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { CampaignService, Campaign } from '../../services/campaign.service';
import { TransactionService, Transaction } from '../../services/transaction.service';
import { BetService, Bet } from '../../services/bet.service';
import { GoalService, Goal, CreateGoalData } from '../../services/goal.service';
import { 
  CampaignDateFilterService, 
  DateFilter, 
  CampaignStats 
} from '../../services/campaign-date-filter.service';

@Component({
  selector: 'app-campaign-detail',
  templateUrl: './campaign-detail.component.html',
  styleUrls: ['./campaign-detail.component.scss']
})
export class CampaignDetailComponent implements OnInit, OnDestroy {
  campaign?: Campaign;
  allTransactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  allBets: Bet[] = [];
  filteredBets: Bet[] = [];
  goals: Goal[] = [];
  showGoalForm = false;
  newGoal: CreateGoalData = { campaign_id: 0, title: '', target_amount: 0 };
  
  // Date filter properties
  dateFilter: DateFilter = { type: 'all' };
  filterDescription = 'All Time';
  
  // Statistics for current filter
  stats: CampaignStats = {
    startBalance: 0,
    endBalance: 0,
    netChange: 0,
    percentageChange: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    netTransactions: 0,
    totalBets: 0,
    winningBets: 0,
    losingBets: 0,
    pendingBets: 0,
    totalStake: 0,
    totalReturn: 0,
    totalProfitLoss: 0,
    roi: 0,
    winRate: 0,
    averageOdds: 0,
    averageStake: 0,
    biggestWin: 0,
    biggestLoss: 0,
    bestBet: null,
    worstBet: null
  };
  
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private campaignService: CampaignService,
    private transactionService: TransactionService,
    private betService: BetService,
    private goalService: GoalService,
    private dateFilterService: CampaignDateFilterService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadCampaign(id);
    this.loadAllData(id);
    
    // Subscribe to filter changes
    this.subscriptions.push(
      this.dateFilterService.currentFilter$.subscribe(filter => {
        this.dateFilter = filter;
        this.filterDescription = this.dateFilterService.getFilterDescription();
        this.applyFilter();
      })
    );
  }
getDepositTransactionsCount(): number {
  return this.filteredTransactions.filter(t => t.type === 'deposit').length;
}

getDepositTransactions(): Transaction[] {
  return this.filteredTransactions.filter(t => t.type === 'deposit');
}

getWithdrawalTransactions(): Transaction[] {
  return this.filteredTransactions.filter(t => t.type === 'withdrawal');
}

getAverageDeposit(): number {
  const deposits = this.getDepositTransactions();
  if (deposits.length === 0) return 0;
  return this.stats.totalDeposits / deposits.length;
}
  loadAllData(campaignId: number): void {
    this.loadTransactions(campaignId);
    this.loadBets(campaignId);
    this.loadGoals(campaignId);
  }

  loadCampaign(id: number): void {
    this.campaignService.get(id).subscribe(c => {
      this.campaign = c;
      // Set start balance for stats
      this.stats.startBalance = c.start_balance;
      this.stats.endBalance = c.current_balance;
      this.calculateStats();
    });
  }

  loadTransactions(campaignId: number): void {
    this.transactionService.getByCampaign(campaignId)
      .subscribe(transactions => {
        this.allTransactions = transactions;
        this.applyFilter();
      });
  }

  loadBets(campaignId: number): void {
    this.betService.getByCampaign(campaignId)
      .subscribe(bets => {
        this.allBets = bets;
        this.applyFilter();
      });
  }

  loadGoals(campaignId: number): void {
    this.goalService.getByCampaign(campaignId)
      .subscribe(g => this.goals = g);
  }

  applyFilter(): void {
    if (!this.campaign) return;
    
    const dateRange = this.dateFilterService.getDateRange();
    
    // Filter transactions
    this.filteredTransactions = this.allTransactions.filter(t => {
      const transDate = new Date(t.created_at);
      return transDate >= dateRange.start && transDate <= dateRange.end;
    });
    
    // Filter bets
    this.filteredBets = this.allBets.filter(b => {
      const betDate = new Date(b.created_at);
      return betDate >= dateRange.start && betDate <= dateRange.end;
    });
    
    // Calculate stats
    this.calculateStats();
  }

  calculateStats(): void {
    if (!this.campaign) return;
    
    // Calculate transaction stats
    const deposits = this.filteredTransactions.filter(t => t.type === 'deposit');
    const withdrawals = this.filteredTransactions.filter(t => t.type === 'withdrawal');
    
    this.stats.totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
    this.stats.totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0);
    this.stats.netTransactions = this.stats.totalDeposits - this.stats.totalWithdrawals;
    
    // Calculate bet stats
    const settledBets = this.filteredBets.filter(b => b.result !== 'pending');
    const winningBets = settledBets.filter(b => b.result === 'win');
    const losingBets = settledBets.filter(b => b.result === 'loss');
    
    this.stats.totalBets = this.filteredBets.length;
    this.stats.winningBets = winningBets.length;
    this.stats.losingBets = losingBets.length;
    this.stats.pendingBets = this.filteredBets.filter(b => b.result === 'pending').length;
    this.stats.totalStake = this.filteredBets.reduce((sum, b) => sum + b.stake, 0);
    this.stats.totalProfitLoss = settledBets.reduce((sum, b) => sum + b.profit_loss, 0);
    this.stats.totalReturn = this.stats.totalStake + this.stats.totalProfitLoss;
    
    // Calculate percentages
    this.stats.roi = this.stats.totalStake > 0 ? (this.stats.totalProfitLoss / this.stats.totalStake) * 100 : 0;
    this.stats.winRate = settledBets.length > 0 ? (winningBets.length / settledBets.length) * 100 : 0;
    
    // Calculate averages
    this.stats.averageOdds = this.filteredBets.length > 0 
      ? this.filteredBets.reduce((sum, b) => sum + b.odds, 0) / this.filteredBets.length 
      : 0;
    this.stats.averageStake = this.filteredBets.length > 0 
      ? this.stats.totalStake / this.filteredBets.length 
      : 0;
    
    // Find biggest win/loss
    this.stats.biggestWin = winningBets.length > 0 ? Math.max(...winningBets.map(b => b.profit_loss)) : 0;
    this.stats.biggestLoss = losingBets.length > 0 ? Math.min(...losingBets.map(b => b.profit_loss)) : 0;
    
    // Find best/worst bet
    this.stats.bestBet = winningBets.length > 0 ? 
      winningBets.reduce((best, current) => current.profit_loss > best.profit_loss ? current : best) : null;
    this.stats.worstBet = losingBets.length > 0 ? 
      losingBets.reduce((worst, current) => current.profit_loss < worst.profit_loss ? current : worst) : null;
    
    // Calculate net change
    this.stats.netChange = this.stats.netTransactions + this.stats.totalProfitLoss;
    this.stats.percentageChange = this.stats.startBalance > 0 
      ? (this.stats.netChange / this.stats.startBalance) * 100 
      : 0;
  }

  onDateFilterChange(filter: DateFilter): void {
    this.dateFilterService.setFilter(filter);
  }

  // Goal methods
  onCreateGoal(): void {
    if (this.campaign) {
      this.newGoal.campaign_id = this.campaign.id;
      this.goalService.create(this.newGoal).subscribe({
        next: (goal) => {
          this.goals.unshift(goal);
          this.showGoalForm = false;
          this.newGoal = { campaign_id: this.campaign!.id, title: '', target_amount: 0 };
        },
        error: (error) => {
          console.error('Error creating goal:', error);
        }
      });
    }
  }

  onUpdateGoalProgress(goalId: number): void {
    this.goalService.updateProgress(goalId).subscribe({
      next: (updatedGoal) => {
        const index = this.goals.findIndex(g => g.id === goalId);
        if (index !== -1) {
          this.goals[index] = updatedGoal;
        }
      }
    });
  }

  onDeleteGoal(goalId: number): void {
    if (confirm('Are you sure you want to delete this goal?')) {
      this.goalService.delete(goalId).subscribe({
        next: () => {
          this.goals = this.goals.filter(g => g.id !== goalId);
        }
      });
    }
  }

  getGoalStatusClass(status: string): string {
    switch(status) {
      case 'completed': return 'bg-success';
      case 'failed': return 'bg-danger';
      default: return 'bg-primary';
    }
  }

  onTransactionAdded(): void {
    if (this.campaign) {
      this.loadCampaign(this.campaign.id);
      this.loadTransactions(this.campaign.id);
      this.updateGoals();
    }
  }

  onBetPlaced(): void {
    if (this.campaign) {
      this.loadCampaign(this.campaign.id);
      this.loadBets(this.campaign.id);
      this.updateGoals();
    }
  }

  updateGoals(): void {
    this.goals.forEach(goal => {
      if (goal.status === 'active') {
        this.onUpdateGoalProgress(goal.id);
      }
    });
  }

  // Goal stats methods
  getCompletedGoalsCount(): number {
    return this.goals.filter(g => g.status === 'completed').length;
  }

  getActiveGoalsCount(): number {
    return this.goals.filter(g => g.status === 'active').length;
  }

  getAverageProgress(): number {
    if (this.goals.length === 0) return 0;
    const total = this.goals.reduce((sum, goal) => sum + goal.progress_percentage, 0);
    return total / this.goals.length;
  }

  getTotalRemainingAmount(): number {
    return this.goals
      .filter(g => g.status === 'active')
      .reduce((sum, goal) => sum + goal.remaining_amount, 0);
  }

  // Helper for sport performance
  getSportPerformance(): any[] {
    const betsBySport = this.filteredBets.reduce((acc, bet) => {
      if (!acc[bet.sport]) {
        acc[bet.sport] = { sport: bet.sport, profit: 0, bets: 0 };
      }
      acc[bet.sport].profit += bet.profit_loss;
      acc[bet.sport].bets += 1;
      return acc;
    }, {} as any);
    
    return Object.values(betsBySport);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}