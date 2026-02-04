import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CampaignDateFilterService, DateFilter } from '../../services/campaign-date-filter.service';

@Component({
  selector: 'app-campaign-date-filter',
  templateUrl: './campaign-date-filter.component.html',
  styleUrls: ['./campaign-date-filter.component.scss']
})
export class CampaignDateFilterComponent implements OnInit {
  @Output() filterChange = new EventEmitter<DateFilter>();
  
  filterTypes = [
    { value: 'all', label: 'All Time', icon: 'fas fa-calendar-alt' },
    { value: 'month', label: 'Month', icon: 'fas fa-calendar-day' },
    { value: 'custom', label: 'Custom', icon: 'fas fa-calendar-week' }
  ];
  
  months = this.dateFilterService.getMonths();
  years = this.dateFilterService.getYears();
  
  currentFilter: DateFilter = { type: 'all' };
  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();
  startDate: string = '';
  endDate: string = '';
  showFilterModal = false;

  constructor(private dateFilterService: CampaignDateFilterService) {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    this.startDate = this.dateFilterService.formatDate(thirtyDaysAgo);
    this.endDate = this.dateFilterService.formatDate(today);
  }

  ngOnInit(): void {
    this.currentFilter = this.dateFilterService.getCurrentFilter();
    this.updateFormFromFilter();
  }

  updateFormFromFilter(): void {
    if (this.currentFilter.type === 'month') {
      this.selectedMonth = this.currentFilter.month || new Date().getMonth() + 1;
      this.selectedYear = this.currentFilter.year || new Date().getFullYear();
    } else if (this.currentFilter.type === 'custom') {
      this.startDate = this.currentFilter.startDate || this.startDate;
      this.endDate = this.currentFilter.endDate || this.endDate;
    }
  }

  onFilterTypeChange(type: string): void {
    if (type === 'all' || type === 'month' || type === 'custom') {
      this.currentFilter.type = type;
      this.applyFilter();
    }
  }
closeModal(): void {
  this.showFilterModal = false;
}
  onMonthChange(): void {
    if (this.currentFilter.type === 'month') {
      this.currentFilter.month = this.selectedMonth;
      this.currentFilter.year = this.selectedYear;
      this.applyFilter();
    }
  }

  onYearChange(): void {
    if (this.currentFilter.type === 'month') {
      this.currentFilter.year = this.selectedYear;
      this.applyFilter();
    }
  }

  onDateRangeChange(): void {
    if (this.currentFilter.type === 'custom') {
      this.currentFilter.startDate = this.startDate;
      this.currentFilter.endDate = this.endDate;
      this.applyFilter();
    }
  }

  applyFilter(): void {
    const filter: DateFilter = { ...this.currentFilter };
    this.filterChange.emit(filter);
  }

  quickSelect(period: 'currentMonth' | 'lastMonth' | 'last30Days' | 'last90Days' | 'allTime'): void {
    const today = new Date();
    
    switch (period) {
      case 'currentMonth':
        this.currentFilter = {
          type: 'month',
          month: today.getMonth() + 1,
          year: today.getFullYear()
        };
        break;
        
      case 'lastMonth':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        this.currentFilter = {
          type: 'month',
          month: lastMonth.getMonth() + 1,
          year: lastMonth.getFullYear()
        };
        break;
        
      case 'last30Days':
        const start30 = new Date();
        start30.setDate(start30.getDate() - 30);
        this.currentFilter = {
          type: 'custom',
          startDate: this.dateFilterService.formatDate(start30),
          endDate: this.dateFilterService.formatDate(today)
        };
        break;
        
      case 'last90Days':
        const start90 = new Date();
        start90.setDate(start90.getDate() - 90);
        this.currentFilter = {
          type: 'custom',
          startDate: this.dateFilterService.formatDate(start90),
          endDate: this.dateFilterService.formatDate(today)
        };
        break;
        
      case 'allTime':
        this.currentFilter = { type: 'all' };
        break;
    }
    
    this.updateFormFromFilter();
    this.applyFilter();
  }

  getFilterDescription(): string {
    return this.dateFilterService.getFilterDescription();
  }
  
  // Helper method to get current date for comparison
  getCurrentMonth(): number {
    return new Date().getMonth() + 1;
  }
  
  getCurrentYear(): number {
    return new Date().getFullYear();
  }
}