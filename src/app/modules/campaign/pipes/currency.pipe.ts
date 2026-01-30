import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyService } from '../services/currency.service';

@Pipe({
  name: 'currencyFormat'
})
export class CurrencyFormatPipe implements PipeTransform {
  constructor(private currencyService: CurrencyService) {}

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return this.currencyService.formatCurrency(0);
    }
    
    return this.currencyService.formatCurrency(value);
  }
}