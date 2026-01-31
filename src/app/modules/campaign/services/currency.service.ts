import { Injectable } from '@angular/core';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  exchangeRate: number; // Relative to USD
  symbolPosition: 'before' | 'after';
}

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  private currentCurrency: Currency = {
    code: 'TND',
    symbol: 'DT',
    name: 'Tunisian Dinar',
    exchangeRate: 3.12,
    symbolPosition: 'after'
  };

  private availableCurrencies: Currency[] = [
    { code: 'USD', symbol: '$', name: 'US Dollar', exchangeRate: 1, symbolPosition: 'before' },
    { code: 'EUR', symbol: '€', name: 'Euro', exchangeRate: 0.92, symbolPosition: 'before' },
    { code: 'GBP', symbol: '£', name: 'British Pound', exchangeRate: 0.79, symbolPosition: 'before' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', exchangeRate: 1.36, symbolPosition: 'before' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', exchangeRate: 1.52, symbolPosition: 'before' },
    { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham', exchangeRate: 10.08, symbolPosition: 'after' },
    { code: 'TND', symbol: 'DT', name: 'Tunisian Dinar', exchangeRate: 3.12, symbolPosition: 'after' }
  ];

  constructor() {
    const savedCurrency = localStorage.getItem('campaignCurrency');
    if (savedCurrency) {
      try {
        this.currentCurrency = JSON.parse(savedCurrency);
      } catch (e) {
        console.error('Error loading saved currency:', e);
      }
    }
  }

  getCurrentCurrency(): Currency {
    return this.currentCurrency;
  }

  getAvailableCurrencies(): Currency[] {
    return this.availableCurrencies;
  }

  setCurrency(currencyCode: string): void {
    const currency = this.availableCurrencies.find(c => c.code === currencyCode);
    if (currency) {
      this.currentCurrency = currency;
      localStorage.setItem('campaignCurrency', JSON.stringify(currency));
      window.dispatchEvent(new Event('currencyChanged'));
    }
  }

  // Convert from selected currency to USD (for backend storage)
  convertToUSD(amount: number): number {
    if (this.currentCurrency.code === 'USD') {
      return amount;
    }
    return amount / this.currentCurrency.exchangeRate;
  }

  // Convert from USD to selected currency (for display)
  convertFromUSD(amount: number): number {
    if (this.currentCurrency.code === 'USD') {
      return amount;
    }
    return amount * this.currentCurrency.exchangeRate;
  }

  convertToCurrent(amount: number): number {
    return amount * this.currentCurrency.exchangeRate;
  }

  formatCurrency(amount: number | null | undefined): string {
    // Handle null/undefined values
    if (amount === null || amount === undefined) {
      amount = 0;
    }
    
    const convertedAmount = this.convertToCurrent(amount);
    
    // Format with 2 decimal places
    const formattedAmount = convertedAmount.toFixed(2);
    
    // Add currency symbol based on position
    if (this.currentCurrency.symbolPosition === 'after') {
      return `${formattedAmount} ${this.currentCurrency.symbol}`;
    } else {
      return `${this.currentCurrency.symbol}${formattedAmount}`;
    }
  }

  getExchangeRate(base: string, target: string): number {
    const baseCurrency = this.availableCurrencies.find(c => c.code === base);
    const targetCurrency = this.availableCurrencies.find(c => c.code === target);
    
    if (baseCurrency && targetCurrency) {
      return targetCurrency.exchangeRate / baseCurrency.exchangeRate;
    }
    
    return 1;
  }

  // Helper to display amount in selected currency
  displayAmount(amountInUSD: number): number {
    return this.convertFromUSD(amountInUSD);
  }

  // Helper to save amount from selected currency to USD
  saveAmount(amountInSelectedCurrency: number): number {
    return this.convertToUSD(amountInSelectedCurrency);
  }
}