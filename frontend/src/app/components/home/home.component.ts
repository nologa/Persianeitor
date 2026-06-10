import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { PedidoService } from '../../services/pedido.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

type Vista = 'dia' | 'semana' | 'mes';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  pedidos: any[] = [];
  loading = true;
  error = '';
  
  vistaActual: Vista = 'mes';
  fechaActual = new Date();
  fechaHoy = new Date();
  
  diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  private destroy$ = new Subject<void>();

  constructor(private pedidoService: PedidoService, private router: Router) {}

  ngOnInit(): void {
    this.cargarPedidos();
    
    // Suscribirse a cambios en los pedidos
    this.pedidoService.pedidosChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cargarPedidos();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarPedidos(): void {
    this.loading = true;
    this.pedidoService.getPedidos().subscribe(
      (data) => {
        this.pedidos = data.filter(p => p.fechaEntrega);
        this.loading = false;
      },
      (error) => {
        console.error('Error cargando pedidos:', error);
        this.error = 'Error al cargar la agenda';
        this.loading = false;
      }
    );
  }

  cambiarVista(vista: Vista): void {
    this.vistaActual = vista;
  }

  irAlDia(dia: number | null): void {
    if (dia === null) return;
    const año = this.fechaActual.getFullYear();
    const mes = this.fechaActual.getMonth();
    this.fechaActual = new Date(año, mes, dia);
    this.vistaActual = 'dia';
  }

  irAlDiaDesdeDate(fecha: Date): void {
    this.fechaActual = new Date(fecha);
    this.vistaActual = 'dia';
  }

  // Navegación
  anteriorPeriodo(): void {
    if (this.vistaActual === 'dia') {
      this.fechaActual.setDate(this.fechaActual.getDate() - 1);
    } else if (this.vistaActual === 'semana') {
      this.fechaActual.setDate(this.fechaActual.getDate() - 7);
    } else {
      this.fechaActual.setMonth(this.fechaActual.getMonth() - 1);
    }
    this.fechaActual = new Date(this.fechaActual);
  }

  siguientePeriodo(): void {
    if (this.vistaActual === 'dia') {
      this.fechaActual.setDate(this.fechaActual.getDate() + 1);
    } else if (this.vistaActual === 'semana') {
      this.fechaActual.setDate(this.fechaActual.getDate() + 7);
    } else {
      this.fechaActual.setMonth(this.fechaActual.getMonth() + 1);
    }
    this.fechaActual = new Date(this.fechaActual);
  }

  hoy(): void {
    this.fechaActual = new Date();
  }

  // Métodos para vista de MES
  getDiasDelMes(): (number | null)[] {
    const año = this.fechaActual.getFullYear();
    const mes = this.fechaActual.getMonth();
    
    const primerDia = (new Date(año, mes, 1).getDay() + 6) % 7; // Lunes como primer día
    const ultimoDia = new Date(año, mes + 1, 0).getDate();
    
    const dias: (number | null)[] = [];
    
    // Llenar con nulls los días del mes anterior
    for (let i = 0; i < primerDia; i++) {
      dias.push(null);
    }
    
    // Llenar con los días del mes
    for (let i = 1; i <= ultimoDia; i++) {
      dias.push(i);
    }
    
    return dias;
  }

  getPedidosPorFecha(dia: number | null): any[] {
    if (dia === null) return [];
    const año = this.fechaActual.getFullYear();
    const mes = String(this.fechaActual.getMonth() + 1).padStart(2, '0');
    const diaStr = String(dia).padStart(2, '0');
    const fecha = `${año}-${mes}-${diaStr}`;
    
    return this.pedidos.filter(p => p.fechaEntrega === fecha);
  }

  esDiaHoy(dia: number | null): boolean {
    if (dia === null) return false;
    return dia === this.fechaHoy.getDate() &&
           this.fechaActual.getMonth() === this.fechaHoy.getMonth() &&
           this.fechaActual.getFullYear() === this.fechaHoy.getFullYear();
  }

  // Métodos para vista de SEMANA
  getSemanaDias(): Date[] {
    const fecha = new Date(this.fechaActual);
    const dia = (fecha.getDay() + 6) % 7; // Lunes como primer día
    const diff = fecha.getDate() - dia;
    
    const primerDiaSemanma = new Date(fecha.setDate(diff));
    const dias: Date[] = [];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(primerDiaSemanma);
      d.setDate(d.getDate() + i);
      dias.push(d);
    }
    
    return dias;
  }

  getPedidosPorFechaObj(fecha: Date): any[] {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const fechaStr = `${año}-${mes}-${dia}`;
    
    return this.pedidos.filter(p => p.fechaEntrega === fechaStr);
  }

  esFechaHoy(fecha: Date): boolean {
    return fecha.getDate() === this.fechaHoy.getDate() &&
           fecha.getMonth() === this.fechaHoy.getMonth() &&
           fecha.getFullYear() === this.fechaHoy.getFullYear();
  }

  formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // Vista de DÍA
  getPedidosDelDia(): any[] {
    const año = this.fechaActual.getFullYear();
    const mes = String(this.fechaActual.getMonth() + 1).padStart(2, '0');
    const dia = String(this.fechaActual.getDate()).padStart(2, '0');
    const fecha = `${año}-${mes}-${dia}`;
    
    return this.pedidos
      .filter(p => p.fechaEntrega === fecha)
      .sort((a, b) => {
        const ha = (a.hora || '23:59');
        const hb = (b.hora || '23:59');
        return ha.localeCompare(hb);
      });
  }

  getTituloPeriodo(): string {
    if (this.vistaActual === 'dia') {
      return this.fechaActual.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (this.vistaActual === 'semana') {
      const semanaDias = this.getSemanaDias();
      const primero = semanaDias[0];
      const ultimo = semanaDias[6];
      return `${primero.getDate()} - ${ultimo.getDate()} ${this.meses[ultimo.getMonth()]} ${ultimo.getFullYear()}`;
    } else {
      return `${this.meses[this.fechaActual.getMonth()]} ${this.fechaActual.getFullYear()}`;
    }
  }

  getTotalPendiente(pedidos: any[]): number {
    return pedidos
      .filter(p => p.estado === 'pendiente')
      .reduce((sum, p) => sum + (p.precio || 0), 0);
  }

  getStatusColor(estado: string): string {
    switch (estado) {
      case 'pendiente':
        return 'status-pendiente';
      case 'esperando':
        return 'status-esperando';
      case 'hecho':
        return 'status-hecho';
      case 'cobrado':
        return 'status-cobrado';
      case 'completado':
        return 'status-hecho';
      case 'cancelado':
        return 'status-esperando';
      default:
        return '';
    }
  }

  crearFaenaDelDia(): void {
    const año = this.fechaActual.getFullYear();
    const mes = String(this.fechaActual.getMonth() + 1).padStart(2, '0');
    const dia = String(this.fechaActual.getDate()).padStart(2, '0');
    const fecha = `${año}-${mes}-${dia}`;
    
    this.router.navigate(['/pedidos/nuevo'], {
      queryParams: { fecha: fecha }
    });
  }
}
