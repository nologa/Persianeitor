import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'money'
})
export class MoneyPipe implements PipeTransform {
  transform(value: number | string | null | undefined, digits: string = '1.2-2'): string {
    if (value === null || value === undefined || value === '') {
      return '0,00';
    }

    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(num)) {
      return '0,00';
    }

    // Usar Intl para formato con coma decimal (locale es-ES)
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    }).format(num);
  }
}
