import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PedidoService } from '../../services/pedido.service';

@Component({
  selector: 'app-agenda',
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.css']
})
export class AgendaComponent implements OnInit {
  pedidos: any[] = [];
  loading = true;
  error = '';
  fechaSeleccionada: string = '';
  hoy = new Date().toISOString().split('T')[0];
  Math = Math; // Hacer Math disponible en el template

  constructor(
    private pedidoService: PedidoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPedidos();
  }

  loadPedidos(): void {
    this.loading = true;
    this.pedidoService.getPedidos().subscribe(
      (data) => {
        this.pedidos = data
          .map((p) => ({
            ...p,
            fechaEntrega: this.normalizarFecha(p.fechaEntrega)
          }))
          .filter(p => p.fechaEntrega);
        this.loading = false;
        // Seleccionar hoy si existe, si no la próxima fecha disponible
        this.fechaSeleccionada = this.fechasUnicas.includes(this.hoy)
          ? this.hoy
          : (this.fechasUnicas[0] || '');
      },
      (error) => {
        console.error('Error cargando pedidos:', error);
        this.error = 'Error al cargar la agenda';
        this.loading = false;
      }
    );
  }

  private normalizarFecha(fecha: any): string {
    if (!fecha) {
      return '';
    }

    if (typeof fecha === 'string') {
      return fecha.length >= 10 ? fecha.slice(0, 10) : fecha;
    }

    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toISOString().slice(0, 10);
  }

  get fechasUnicas(): string[] {
    const fechas = this.pedidos
      .map(p => p.fechaEntrega)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
    return fechas;
  }

  get pedidosPorFecha(): any[] {
    return this.pedidos.filter(p => p.fechaEntrega === this.fechaSeleccionada);
  }

  get totalPendiente(): number {
    return this.pedidosPorFecha
      .filter(p => p.estado === 'pendiente')
      .reduce((sum, p) => sum + (p.precio || 0), 0);
  }

  get diasRestantes(): number {
    if (!this.fechaSeleccionada) return 0;
    const fecha = new Date(this.fechaSeleccionada);
    const hoy = new Date(this.hoy);
    const diferencia = fecha.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  }

  formatearFecha(fecha: string): string {
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', opciones);
  }

  getStatusColor(estado: string): string {
    switch (estado) {
      case 'pendiente':
        return 'status-pendiente';
      case 'completado':
        return 'status-completado';
      case 'cancelado':
        return 'status-cancelado';
      default:
        return '';
    }
  }

  getPrioridadClass(): string {
    if (this.diasRestantes < 0) return 'urgente';
    if (this.diasRestantes === 0) return 'hoy';
    if (this.diasRestantes <= 3) return 'proximo';
    return 'normal';
  }

  contarPedidosPorFecha(fecha: string): number {
    return this.pedidos.filter(p => p.fechaEntrega === fecha).length;
  }

  obtenerAbsoluteValue(valor: number): number {
    return Math.abs(valor);
  }

  verPedido(id: number): void {
    this.router.navigate(['/pedidos', id]);
  }
}
