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
  isMobile: boolean = false;

  constructor(
    private currencyService: CurrencyService,
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.currencies = this.currencyService.getAvailableCurrencies();
    this.currentCurrency = this.currencyService.getCurrentCurrency();
    this.checkMobile();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
  }

  checkMobile(): void {
    this.isMobile = window.innerWidth < 768;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside && this.showDropdown) {
      this.closeDropdown();
    }
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onScrollOrResize(): void {
    if (this.showDropdown && !this.isMobile) {
      this.calculateDropdownPosition();
    }
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    
    this.showDropdown = !this.showDropdown;
    
    if (this.showDropdown) {
      if (this.isMobile) {
        // Center the dropdown on mobile
        this.centerDropdownOnMobile();
      } else {
        this.calculateDropdownPosition();
      }
      this.renderer.addClass(document.body, 'dropdown-open');
    } else {
      this.closeDropdown();
    }
  }

  centerDropdownOnMobile(): void {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dropdownWidth = 320; // Match your SCSS max-width
    
    this.dropdownPosition = {
      top: viewportHeight / 2 - 200, // Center vertically (assuming ~400px height)
      left: (viewportWidth - dropdownWidth) / 2,
      width: dropdownWidth
    };
  }

  calculateDropdownPosition(): void {
    const button = this.elementRef.nativeElement.querySelector('.currency-toggle');
    if (!button) return;
    
    const rect = button.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Calculate position below the button
    this.dropdownPosition = {
      top: rect.bottom + scrollTop + 5, // 5px gap
      left: rect.left + scrollLeft,
      width: Math.max(rect.width, 280) // Minimum width from SCSS
    };
    
    // Check if dropdown would go off screen on the right
    const dropdownRight = this.dropdownPosition.left + this.dropdownPosition.width;
    const viewportWidth = window.innerWidth;
    
    if (dropdownRight > viewportWidth - 20) { // 20px margin
      this.dropdownPosition.left = viewportWidth - this.dropdownPosition.width - 20;
    }
    
    // Check if dropdown would go off screen at the bottom (mobile)
    if (this.isMobile) {
      const dropdownBottom = this.dropdownPosition.top + 400; // Estimated height
      const viewportHeight = window.innerHeight;
      
      if (dropdownBottom > viewportHeight - 20) {
        this.dropdownPosition.top = Math.max(20, viewportHeight - 420);
      }
    }
  }

  closeDropdown(): void {
    this.showDropdown = false;
    this.renderer.removeClass(document.body, 'dropdown-open');
  }

  selectCurrency(currency: Currency): void {
    if (this.currentCurrency.code !== currency.code) {
      this.currencyService.setCurrency(currency.code);
      this.currentCurrency = currency;
      
      if (!this.isMobile) {
        // Auto-reload on desktop
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
      // On mobile, we keep the dropdown open so user can click "Apply & Reload"
    }
  }

  reloadPage(): void {
    this.closeDropdown();
    setTimeout(() => {
      window.location.reload();
    }, 100);
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