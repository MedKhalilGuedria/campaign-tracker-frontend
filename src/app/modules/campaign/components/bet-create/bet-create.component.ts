// src/app/components/bet-create/bet-create.component.ts
import { Component, Input, EventEmitter, Output, OnInit } from '@angular/core';
import { BetService } from '../../services/bet.service';
import { CampaignService } from '../../services/campaign.service';
import { CurrencyService } from '../../services/currency.service';

@Component({
  selector: 'app-bet-create',
  templateUrl: './bet-create.component.html',
  styleUrls: ['./bet-create.component.scss']
})
export class BetCreateComponent implements OnInit {
  @Input() campaignId!: number;
  @Input() currentBalance!: number;
  @Output() betPlaced = new EventEmitter<void>();

  category = '';
  odds = 0;
  stake: number | null = null;
  useFullBalance = true;
  errorMessage = '';
  
  // Category management
  availableCategories: string[] = [];
  categoriesForSelect: { value: string; label: string }[] = [];
  showNewCategoryInput: boolean = false;
  newCategory: string = '';
  isAddingCategory: boolean = false;

  constructor(
    private betService: BetService,
    private campaignService: CampaignService,
    public currencyService: CurrencyService
  ) { }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.betService.getCategories().subscribe({
      next: (categories) => {
        this.availableCategories = categories;
        this.updateCategoriesForSelect();
        // If there are categories, select the first one by default
        if (this.availableCategories.length > 0) {
          this.category = this.availableCategories[0];
        }
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        // Fallback categories
        this.availableCategories = ['Football', 'Basketball', 'Tennis', 'Casino', 'Esports'];
        this.updateCategoriesForSelect();
        if (this.availableCategories.length > 0) {
          this.category = this.availableCategories[0];
        }
      }
    });
  }

  updateCategoriesForSelect(): void {
    this.categoriesForSelect = this.availableCategories.map(cat => ({
      value: cat,
      label: this.formatCategoryName(cat)
    }));
  }

  formatCategoryName(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  // Handle checkbox change immediately
  onUseFullBalanceChange(checked: boolean): void {
    this.useFullBalance = checked;
    
    if (checked) {
      // Using full balance - clear stake
      this.stake = null;
    } else {
      // Custom stake - set to current balance by default
      this.stake = this.currencyService.displayAmount(this.currentBalance);
    }
  }

  // Toggle new category input
  toggleNewCategoryInput(): void {
    this.showNewCategoryInput = !this.showNewCategoryInput;
    if (!this.showNewCategoryInput) {
      this.newCategory = '';
    }
  }

  // Add new category
  addNewCategory(): void {
    const trimmedCategory = this.newCategory.trim();
    if (!trimmedCategory) {
      this.errorMessage = 'Please enter a category name';
      return;
    }

    // Check if category already exists
    if (this.availableCategories.some(cat => cat.toLowerCase() === trimmedCategory.toLowerCase())) {
      this.errorMessage = 'Category already exists';
      return;
    }

    this.isAddingCategory = true;
    this.errorMessage = '';

    // Add the category locally (it will be saved when a bet is placed)
    this.availableCategories.push(trimmedCategory);
    this.updateCategoriesForSelect();
    this.category = trimmedCategory;
    this.showNewCategoryInput = false;
    this.newCategory = '';
    this.isAddingCategory = false;
  }

  submit(): void {
    const availableBalance = this.currencyService.displayAmount(this.currentBalance);
    
    // Validation
    if (availableBalance <= 0) {
      this.errorMessage = 'No balance available to place bet';
      return;
    }

    if (!this.category.trim()) {
      this.errorMessage = 'Category is required';
      return;
    }

    if (this.odds <= 1) {
      this.errorMessage = 'Odds must be greater than 1';
      return;
    }

    // Calculate stake - can be number or null
    let stakeToSend: number | null = null;
    if (!this.useFullBalance) {
      if (!this.stake || this.stake <= 0) {
        this.errorMessage = 'Stake must be greater than 0';
        return;
      }
      if (this.stake > availableBalance) {
        const formattedBalance = this.currencyService.formatCurrency(availableBalance);
        this.errorMessage = `Stake exceeds available balance of ${formattedBalance}`;
        return;
      }
      // Convert stake back to USD for API
      stakeToSend = this.currencyService.convertToUSD(this.stake);
    }

    this.betService.create({
      campaign_id: this.campaignId,
      category: this.category,
      odds: this.odds,
      stake: stakeToSend
    }).subscribe({
      next: () => {
        this.resetForm();
        this.betPlaced.emit();
        this.campaignService.get(this.campaignId).subscribe();
        // Reload categories after bet is placed (in case new category was added)
        this.loadCategories();
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Error placing bet';
      }
    });
  }

  resetForm(): void {
    this.category = this.availableCategories.length > 0 ? this.availableCategories[0] : '';
    this.odds = 0;
    this.stake = null;
    this.useFullBalance = true;
    this.errorMessage = '';
    this.showNewCategoryInput = false;
    this.newCategory = '';
  }

  calculateStake(): number {
    if (this.useFullBalance) {
      return this.currencyService.displayAmount(this.currentBalance);
    } else {
      return this.stake || 0;
    }
  }

  get potentialWin(): number {
    const stakeAmount = this.calculateStake();
    return stakeAmount * this.odds;
  }

  get remainingBalance(): number {
    const stakeAmount = this.calculateStake();
    return this.currencyService.displayAmount(this.currentBalance) - stakeAmount;
  }

  get potentialProfit(): number {
    const stakeAmount = this.calculateStake();
    return (stakeAmount * this.odds) - stakeAmount;
  }
}