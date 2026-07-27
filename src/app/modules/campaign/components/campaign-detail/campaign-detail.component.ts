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
import { CurrencyService } from '../../services/currency.service';

// ─── Sport icon map (same as campaign-list) ───────────────────────────────────
const SPORT_ICONS: Record<string, string> = {
  football: '⚽', soccer: '⚽', 'football (cl)': '⚽', 'football/basketball': '⚽🏀',
  basketball: '🏀', tennis: '🎾', baseball: '⚾', 'american football': '🏈', nfl: '🏈',
  rugby: '🏉', hockey: '🏒', 'ice hockey': '🏒', boxing: '🥊', mma: '🥋',
  golf: '⛳', volleyball: '🏐', cricket: '🏏', 'table tennis': '🏓',
  cycling: '🚴', swimming: '🏊', athletics: '🏃', running: '🏃',
  casino: '🎰', slots: '🎰', esports: '🎮', 'horse racing': '🐎', horses: '🐎',
  darts: '🎯', snooker: '🎱', billiards: '🎱',
  'bonus staked': '🎁', bonus: '🎁', 'lucky friday': '🍀', lucky: '🍀',
  unknown: '🏅',
};

function getSportIcon(sport: string): string {
  if (!sport) return '🏅';
  const lower = sport.toLowerCase().trim();
  if (SPORT_ICONS[lower]) return SPORT_ICONS[lower];
  for (const key of Object.keys(SPORT_ICONS)) {
    if (lower.includes(key) || key.includes(lower)) return SPORT_ICONS[key];
  }
  return '🏅';
}

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

  // Date filter
  dateFilter: DateFilter = { type: 'all' };
  filterDescription = 'All Time';

  // ── Bet list state ────────────────────────────────────────────────────────────
  betResultFilter: 'all' | 'win' | 'loss' | 'pending' | 'void' = 'all';
  betSortField = 'date_desc';
  betCurrentPage = 1;
  betPageSize = 10;

  // Derived — rebuilt whenever filter/sort/page changes
  filteredAndSortedBets: Bet[] = [];
  pagedBets: Bet[] = [];
  betTotalPages = 1;
  betPageStart = 0;
  betPageEnd = 0;
  betPageNumbers: number[] = [];

  // Statistics
  stats: CampaignStats = {
    startBalance: 0, endBalance: 0, netChange: 0, percentageChange: 0,
    totalDeposits: 0, totalWithdrawals: 0, netTransactions: 0,
    totalBets: 0, winningBets: 0, losingBets: 0, pendingBets: 0,
    totalStake: 0, totalReturn: 0, totalProfitLoss: 0,
    roi: 0, winRate: 0, averageOdds: 0, averageStake: 0,
    biggestWin: 0, biggestLoss: 0, bestBet: null, worstBet: null
  };

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private campaignService: CampaignService,
    private transactionService: TransactionService,
    private betService: BetService,
    private goalService: GoalService,
    private dateFilterService: CampaignDateFilterService,
    public currencyService: CurrencyService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadCampaign(id);
    this.loadAllData(id);

    this.subscriptions.push(
      this.dateFilterService.currentFilter$.subscribe(filter => {
        this.dateFilter = filter;
        this.filterDescription = this.dateFilterService.getFilterDescription();
        this.applyFilter();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  // ── Sport icon (template helper) ─────────────────────────────────────────────
  getSportIcon(sport: string): string {
    return getSportIcon(sport);
  }

  // ── Transactions helpers ──────────────────────────────────────────────────────
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
    return deposits.length === 0 ? 0 : this.stats.totalDeposits / deposits.length;
  }

  // ── Data loading ──────────────────────────────────────────────────────────────
  loadAllData(campaignId: number): void {
    this.loadTransactions(campaignId);
    this.loadBets(campaignId);
    this.loadGoals(campaignId);
  }

  loadCampaign(id: number): void {
    this.campaignService.get(id).subscribe(c => {
      this.campaign = c;
      this.stats.startBalance = c.start_balance;
      this.stats.endBalance = c.current_balance;
      this.calculateStats();
    });
  }

  loadTransactions(campaignId: number): void {
    this.transactionService.getByCampaign(campaignId).subscribe(transactions => {
      this.allTransactions = transactions;
      this.applyFilter();
    });
  }

  loadBets(campaignId: number): void {
    this.betService.getByCampaign(campaignId).subscribe(bets => {
      this.allBets = bets;
      this.applyFilter();
    });
  }

  loadGoals(campaignId: number): void {
    this.goalService.getByCampaign(campaignId).subscribe(g => this.goals = g);
  }

  // ── Filtering & stats ─────────────────────────────────────────────────────────
  applyFilter(): void {
    if (!this.campaign) return;

    const dateRange = this.dateFilterService.getDateRange();

    this.filteredTransactions = this.allTransactions.filter(t => {
      const d = new Date(t.created_at);
      return d >= dateRange.start && d <= dateRange.end;
    });

    this.filteredBets = this.allBets.filter(b => {
      const d = new Date(b.created_at);
      return d >= dateRange.start && d <= dateRange.end;
    });

    this.calculateStats();

    // Reset bet list to page 1 when date filter changes
    this.betCurrentPage = 1;
    this.rebuildBetList();
  }

  calculateStats(): void {
    if (!this.campaign) return;

    const deposits = this.filteredTransactions.filter(t => t.type === 'deposit');
    const withdrawals = this.filteredTransactions.filter(t => t.type === 'withdrawal');

    this.stats.totalDeposits = deposits.reduce((s, t) => s + t.amount, 0);
    this.stats.totalWithdrawals = withdrawals.reduce((s, t) => s + t.amount, 0);
    this.stats.netTransactions = this.stats.totalDeposits - this.stats.totalWithdrawals;

    const settledBets = this.filteredBets.filter(b => b.result !== 'pending');
    const winningBets = settledBets.filter(b => b.result === 'win');
    const losingBets  = settledBets.filter(b => b.result === 'loss');

    this.stats.totalBets    = this.filteredBets.length;
    this.stats.winningBets  = winningBets.length;
    this.stats.losingBets   = losingBets.length;
    this.stats.pendingBets  = this.filteredBets.filter(b => b.result === 'pending').length;
    this.stats.totalStake   = this.filteredBets.reduce((s, b) => s + b.stake, 0);
    this.stats.totalProfitLoss = settledBets.reduce((s, b) => s + b.profit_loss, 0);
    this.stats.totalReturn  = this.stats.totalStake + this.stats.totalProfitLoss;

    this.stats.roi     = this.stats.totalStake > 0 ? (this.stats.totalProfitLoss / this.stats.totalStake) * 100 : 0;
    this.stats.winRate = settledBets.length > 0 ? (winningBets.length / settledBets.length) * 100 : 0;

    this.stats.averageOdds  = this.filteredBets.length > 0
      ? this.filteredBets.reduce((s, b) => s + b.odds, 0) / this.filteredBets.length : 0;
    this.stats.averageStake = this.filteredBets.length > 0
      ? this.stats.totalStake / this.filteredBets.length : 0;

    this.stats.biggestWin  = winningBets.length > 0 ? Math.max(...winningBets.map(b => b.profit_loss)) : 0;
    this.stats.biggestLoss = losingBets.length  > 0 ? Math.min(...losingBets.map(b => b.profit_loss))  : 0;

    this.stats.bestBet  = winningBets.length > 0
      ? winningBets.reduce((best, cur) => cur.profit_loss > best.profit_loss ? cur : best) : null;
    this.stats.worstBet = losingBets.length  > 0
      ? losingBets.reduce((worst, cur) => cur.profit_loss < worst.profit_loss ? cur : worst) : null;

    this.stats.netChange = this.stats.netTransactions + this.stats.totalProfitLoss;
    this.stats.percentageChange = this.stats.startBalance > 0
      ? (this.stats.netChange / this.stats.startBalance) * 100 : 0;
  }

  // ── Bet list: filter / sort / paginate ────────────────────────────────────────

  /** Called whenever filter chip, sort select, or page size changes. */
  rebuildBetList(): void {
    // 1. Filter by result
    let bets = this.betResultFilter === 'all'
      ? [...this.filteredBets]
      : this.filteredBets.filter(b => b.result === this.betResultFilter);

    // 2. Sort
    switch (this.betSortField) {
      case 'date_desc':
        bets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'date_asc':
        bets.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'profit_desc':
        bets.sort((a, b) => b.profit_loss - a.profit_loss);
        break;
      case 'profit_asc':
        bets.sort((a, b) => a.profit_loss - b.profit_loss);
        break;
      case 'stake_desc':
        bets.sort((a, b) => b.stake - a.stake);
        break;
    }

    this.filteredAndSortedBets = bets;

    // 3. Paginate
    this.betTotalPages = Math.max(1, Math.ceil(bets.length / this.betPageSize));

    // Clamp current page
    if (this.betCurrentPage > this.betTotalPages) this.betCurrentPage = this.betTotalPages;
    if (this.betCurrentPage < 1) this.betCurrentPage = 1;

    const start = (this.betCurrentPage - 1) * this.betPageSize;
    const end   = start + this.betPageSize;
    this.pagedBets   = bets.slice(start, end);
    this.betPageStart = bets.length === 0 ? 0 : start + 1;
    this.betPageEnd   = Math.min(end, bets.length);

    // 4. Build page number array (with ellipsis markers = -1)
    this.betPageNumbers = this.buildPageNumbers(this.betCurrentPage, this.betTotalPages);
  }

  /** Generates a compact page-number array, e.g. [1, -1, 4, 5, 6, -1, 12] */
  private buildPageNumbers(current: number, total: number): number[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages: number[] = [];
    const delta = 2;

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== -1) {
        pages.push(-1); // ellipsis marker
      }
    }
    return pages;
  }

  setBetFilter(result: 'all' | 'win' | 'loss' | 'pending' | 'void'): void {
    this.betResultFilter = result;
    this.betCurrentPage = 1;
    this.rebuildBetList();
  }

  onSortChange(): void {
    this.betCurrentPage = 1;
    this.rebuildBetList();
  }

  onBetPageSizeChange(): void {
    this.betCurrentPage = 1;
    this.rebuildBetList();
  }

  setBetPage(page: number): void {
    if (page < 1 || page > this.betTotalPages) return;
    this.betCurrentPage = page;
    this.rebuildBetList();
  }

  /** Total stake for the current filter (all pages) */
  getFilteredTotalStake(): number {
    return this.filteredAndSortedBets.reduce((s, b) => s + b.stake, 0);
  }

  /** Total P/L for the current filter (all pages) */
  getFilteredTotalPL(): number {
    return this.filteredAndSortedBets.reduce((s, b) => s + b.profit_loss, 0);
  }

  // ── Date filter ───────────────────────────────────────────────────────────────
  onDateFilterChange(filter: DateFilter): void {
    this.dateFilterService.setFilter(filter);
  }

  // ── Goals ─────────────────────────────────────────────────────────────────────
  onCreateGoal(): void {
    if (!this.campaign) return;
    this.newGoal.campaign_id = this.campaign.id;
    this.goalService.create(this.newGoal).subscribe({
      next: goal => {
        this.goals.unshift(goal);
        this.showGoalForm = false;
        this.newGoal = { campaign_id: this.campaign!.id, title: '', target_amount: 0 };
      },
      error: err => console.error('Error creating goal:', err)
    });
  }

  onUpdateGoalProgress(goalId: number): void {
    this.goalService.updateProgress(goalId).subscribe({
      next: updated => {
        const idx = this.goals.findIndex(g => g.id === goalId);
        if (idx !== -1) this.goals[idx] = updated;
      }
    });
  }

  onDeleteGoal(goalId: number): void {
    if (confirm('Are you sure you want to delete this goal?')) {
      this.goalService.delete(goalId).subscribe({
        next: () => this.goals = this.goals.filter(g => g.id !== goalId)
      });
    }
  }

  getGoalStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'failed':    return 'bg-danger';
      default:          return 'bg-primary';
    }
  }

  onTransactionAdded(): void {
    if (!this.campaign) return;
    this.loadCampaign(this.campaign.id);
    this.loadTransactions(this.campaign.id);
    this.updateGoals();
  }

  onBetPlaced(): void {
    if (!this.campaign) return;
    this.loadCampaign(this.campaign.id);
    this.loadBets(this.campaign.id);
    this.updateGoals();
  }

  updateGoals(): void {
    this.goals.forEach(goal => {
      if (goal.status === 'active') this.onUpdateGoalProgress(goal.id);
    });
  }

  getCompletedGoalsCount(): number { return this.goals.filter(g => g.status === 'completed').length; }
  getActiveGoalsCount(): number    { return this.goals.filter(g => g.status === 'active').length; }

  getAverageProgress(): number {
    if (this.goals.length === 0) return 0;
    return this.goals.reduce((s, g) => s + g.progress_percentage, 0) / this.goals.length;
  }

  getTotalRemainingAmount(): number {
    return this.goals.filter(g => g.status === 'active').reduce((s, g) => s + g.remaining_amount, 0);
  }

  getSportPerformance(): any[] {
    const map = this.filteredBets.reduce((acc, bet) => {
      if (!acc[bet.category]) acc[bet.category] = { sport: bet.category, profit: 0, bets: 0 };
      acc[bet.category].profit += bet.profit_loss;
      acc[bet.category].bets += 1;
      return acc;
    }, {} as any);
    return Object.values(map);
  }

  markAsWin(bet: Bet): void {
  const updatedBet: Bet = {
    ...bet,
    result: 'win',
    profit_loss: bet.stake * (bet.odds - 1)
  };
  this.updateBetResult(updatedBet);
}

markAsLoss(bet: Bet): void {
  const updatedBet: Bet = {
    ...bet,
    result: 'loss',
    profit_loss: -bet.stake
  };
  this.updateBetResult(updatedBet);
}

markAsVoid(bet: Bet): void {
  const updatedBet: Bet = {
    ...bet,
    result: 'void',
    profit_loss: 0
  };
  this.updateBetResult(updatedBet);
}

private updateBetResult(updatedBet: Bet): void {
  this.betService.updateResult(updatedBet.id, updatedBet.result, updatedBet.profit_loss)
    .subscribe({
      next: () => {
        // Reload all data to refresh everything
        if (this.campaign) {
          this.loadBets(this.campaign.id);
          this.loadCampaign(this.campaign.id);
          this.updateGoals();
        }
      },
      error: (error) => {
        console.error('Error updating bet result:', error);
      }
    });
}
}