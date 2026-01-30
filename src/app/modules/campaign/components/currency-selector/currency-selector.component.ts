import { Component, OnInit, HostListener, ElementRef, Renderer2 } from '@angular/core';
import { CurrencyService, Currency } from '../../services/currency.service';

@Component({
  selector: 'app-currency-selector',
  templateUrl: './currency-selector.component.html',
  styleUrls: ['./currency-selector.component.scss']
})
export class CurrencySelectorComponent implements OnInit {
  currencies: Currency[] = [];
  currentCurrency!: Currency;
  showDropdown: boolean = false;
  dropdownPosition: { top: number, left: number, width: number } = { top: 0, left: 0, width: 0 };

  constructor(
    private currencyService: CurrencyService,
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.currencies = this.currencyService.getAvailableCurrencies();
    this.currentCurrency = this.currencyService.getCurrentCurrency();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.showDropdown = false;
    }
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onScrollOrResize(): void {
    if (this.showDropdown) {
      this.calculateDropdownPosition();
    }
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    
    this.showDropdown = !this.showDropdown;
    
    if (this.showDropdown) {
      this.calculateDropdownPosition();
      // Add class to body to prevent scrolling
      this.renderer.addClass(document.body, 'dropdown-open');
    } else {
      this.renderer.removeClass(document.body, 'dropdown-open');
    }
  }

  calculateDropdownPosition(): void {
    const button = this.elementRef.nativeElement.querySelector('.currency-toggle');
    if (!button) return;
    
    const rect = button.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    this.dropdownPosition = {
      top: rect.bottom + scrollTop,
      left: rect.left + scrollLeft,
      width: rect.width
    };
  }

  selectCurrency(currency: Currency): void {
    if (this.currentCurrency.code !== currency.code) {
      this.currencyService.setCurrency(currency.code);
      this.currentCurrency = currency;
      this.showDropdown = false;
      this.renderer.removeClass(document.body, 'dropdown-open');
      
      // Smooth page reload
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  }

  getExchangeRateInfo(currency: Currency): string {
    if (currency.code === 'USD') return 'Base currency';
    
    const rate = this.currencyService.getExchangeRate('USD', currency.code);
    const inverseRate = 1 / rate;
    return `1 ${currency.code} = ${inverseRate.toFixed(4)} USD`;
  }

  ngOnDestroy(): void {
    this.renderer.removeClass(document.body, 'dropdown-open');
  }
}