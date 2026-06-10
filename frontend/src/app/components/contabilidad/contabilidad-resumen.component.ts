import { Component, OnInit } from '@angular/core';
import { ContabilidadService } from '../../services/contabilidad.service';

@Component({
  selector: 'app-contabilidad-resumen',
  templateUrl: './contabilidad-resumen.component.html',
  styleUrls: ['./contabilidad-resumen.component.css']
})
export class ContabilidadResumenComponent implements OnInit {
  resumenMensual: any[] = [];
  loading = true;
  error = '';
  selectedYear: string = new Date().getFullYear().toString();
  availableYears: string[] = [];

  constructor(private contabilidadService: ContabilidadService) { }

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 3; i <= currentYear + 1; i++) {
      this.availableYears.push(i.toString());
    }
    this.loadResumenMensual();
  }

  loadResumenMensual(): void {
    this.loading = true;
    this.error = '';
    this.contabilidadService.getResumenMensual(this.selectedYear).subscribe({
      next: (data: any[]) => {
        this.resumenMensual = data;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error cargando resumen mensual:', err);
        this.error = 'Error al cargar los datos de contabilidad';
        this.loading = false;
      }
    });
  }

  onYearChange(): void {
    this.loadResumenMensual();
  }

  formatMes(mes: string): string {
    const [year, month] = mes.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  }
}