import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { PedidoService } from '../../../services/pedido.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-pedidos-list',
  templateUrl: './pedidos-list.component.html',
  styleUrls: ['./pedidos-list.component.css']
})
export class PedidosListComponent implements OnInit, OnDestroy {
  pedidos: any[] = [];
  loading = true;
  error = '';
  filtroEstado = '';
  criterioOrden: 'fecha' | 'estado' = 'estado';
  vistaActual: 'tabla' | 'tarjetas' = 'tabla';
  private destroy$ = new Subject<void>();

  constructor(
    private pedidoService: PedidoService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadPedidos();
    
    // Suscribirse a cambios en los pedidos
    this.pedidoService.pedidosChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadPedidos();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPedidos(): void {
    this.loading = true;
    // Siempre traer desde el backend para obtener clienteNombre actualizado
    this.pedidoService.getPedidosDesdeBackend().subscribe(
      (data) => {
        this.pedidos = data;
        this.loading = false;
      },
      (error) => {
        console.error('Error cargando pedidos:', error);
        this.error = 'Error al cargar pedidos';
        this.loading = false;
      }
    );
  }

  getEstadoPrioridad(estado: string): number {
    const prioridades: { [key: string]: number } = {
      'pendiente': 1,
      'esperando': 2,
      'volver_contactar': 3,
      'hecho': 4,
      'cobrado': 5,
      'cancelado': 6
    };
    return prioridades[estado] || 7;
  }

  get pedidosFiltrados(): any[] {
    let resultado = [...this.pedidos];
    if (this.filtroEstado) {
      resultado = resultado.filter(p => p.estado === this.filtroEstado);
    }

    return resultado.sort((a, b) => {
      if (this.criterioOrden === 'estado') {
        const prioridadA = this.getEstadoPrioridad(a.estado);
        const prioridadB = this.getEstadoPrioridad(b.estado);
        
        if (prioridadA !== prioridadB) {
          return prioridadA - prioridadB;
        }
      }

      // Ordenar por fecha (más reciente primero)
      const fechaA = new Date(a.fechaEntrega || a.createdAt).getTime();
      const fechaB = new Date(b.fechaEntrega || b.createdAt).getTime();
      return fechaB - fechaA;
    });
  }

  toggleVista(): void {
    this.vistaActual = this.vistaActual === 'tabla' ? 'tarjetas' : 'tabla';
  }

  nuevoPedido(): void {
    this.router.navigate(['/pedidos/nuevo']);
  }

  verPedido(id: number): void {
    this.router.navigate(['/pedidos', id]);
  }

  editarPedido(id: number): void {
    this.router.navigate(['/pedidos/editar', id]);
  }

  eliminarPedido(id: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
      this.pedidoService.deletePedido(id).subscribe(
        () => {
          this.pedidos = this.pedidos.filter(p => p.id !== id);
        },
        (error) => {
          console.error('Error eliminando pedido:', error);
          alert('Error al eliminar pedido');
        }
      );
    }
  }

  getStatusClass(estado: string): string {
    switch (estado) {
      case 'pendiente':
        return 'status-pendiente';
      case 'esperando':
        return 'status-esperando';
      case 'volver_contactar':
        return 'status-volver_contactar';
      case 'hecho':
        return 'status-hecho';
      case 'cobrado':
        return 'status-cobrado';
      case 'completado':
        return 'status-hecho';
      case 'cancelado':
        return 'status-cancelado';
      default:
        return '';
    }
  }

  getEstadoLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      'pendiente': 'Pendiente',
      'esperando': 'Esperando',
      'volver_contactar': 'Contactar',
      'hecho': 'Hecho',
      'cobrado': 'Cobrado',
      'cancelado': 'Cancelado'
    };
    return labels[estado] || estado;
  }
}
