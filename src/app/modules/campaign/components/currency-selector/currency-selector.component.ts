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
    const dropdownWidth = 320;
    
    this.dropdownPosition = {
      top: viewportHeight / 2 - 200,
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
    
    this.dropdownPosition = {
      top: rect.bottom + scrollTop + 5,
      left: rect.left + scrollLeft,
      width: Math.max(rect.width, 280)
    };
    
    const dropdownRight = this.dropdownPosition.left + this.dropdownPosition.width;
    const viewportWidth = window.innerWidth;
    
    if (dropdownRight > viewportWidth - 20) {
      this.dropdownPosition.left = viewportWidth - this.dropdownPosition.width - 20;
    }
  }

  getDropdownStyles(): any {
    const styles: any = {
      'background': '#fff',
      'border': '1px solid #dee2e6',
      'border-radius': '8px',
      'box-shadow': '0 10px 40px rgba(0,0,0,0.2)',
      'z-index': '99999',
      'max-height': '80vh',
      'overflow-y': 'auto',
      'min-width': '280px'
    };
    
    if (this.isMobile) {
      styles['top'] = '50%';
      styles['left'] = '50%';
      styles['transform'] = 'translate(-50%, -50%)';
      styles['width'] = '90%';
      styles['max-width'] = '320px';
    } else {
      styles['top'] = this.dropdownPosition.top + 'px';
      styles['left'] = this.dropdownPosition.left + 'px';
      styles['min-width'] = this.dropdownPosition.width + 'px';
    }
    
    return styles;
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
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
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