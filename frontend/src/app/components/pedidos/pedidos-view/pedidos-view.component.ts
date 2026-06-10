import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PedidoService } from '../../../services/pedido.service';
import { PedidoItemsService } from '../../../services/pedido-items.service';

@Component({
  selector: 'app-pedidos-view',
  templateUrl: './pedidos-view.component.html',
  styleUrls: ['./pedidos-view.component.css']
})
export class PedidosViewComponent implements OnInit {
  pedido: any = null;
  items: any[] = [];
  loading = true;
  error = '';
  pedidoId: number | null = null;

  constructor(
    private pedidoService: PedidoService,
    private pedidoItemsService: PedidoItemsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.pedidoId = +params['id'];
        this.loadPedido(this.pedidoId);
        this.loadItems(this.pedidoId);
      }
    });
  }

  loadPedido(id: number): void {
    this.loading = true;
    this.pedidoService.getPedido(id).subscribe(
      (data) => {
        this.pedido = data;
        this.loading = false;
      },
      (error) => {
        console.error('Error cargando pedido:', error);
        this.error = 'Error al cargar el pedido';
        this.loading = false;
      }
    );
  }

  loadItems(pedidoId: number): void {
    this.pedidoItemsService.getItemsByPedido(pedidoId).subscribe(
      (data) => {
        this.items = data;
      },
      (error) => {
        console.error('Error cargando items:', error);
      }
    );
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
      default:
        return '';
    }
  }

  editarPedido(): void {
    if (this.pedidoId) {
      this.router.navigate(['/pedidos', this.pedidoId]);
    }
  }

  volver(): void {
    this.router.navigate(['/pedidos']);
  }

  abrirMaps(direccion: string): void {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(direccion)}`;
    window.open(url, '_blank');
  }
}
