import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClienteService } from '../../../services/cliente.service';

@Component({
  selector: 'app-clientes-list',
  templateUrl: './clientes-list.component.html',
  styleUrls: ['./clientes-list.component.css']
})
export class ClientesListComponent implements OnInit {
  clientes: any[] = [];
  loading = true;
  error = '';

  constructor(
    private clienteService: ClienteService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadClientes();
  }

  loadClientes(): void {
    this.loading = true;
    this.clienteService.getClientes().subscribe(
      (data) => {
        this.clientes = data;
        this.loading = false;
      },
      (error) => {
        console.error('Error cargando clientes:', error);
        this.error = 'Error al cargar clientes';
        this.loading = false;
      }
    );
  }

  nuevoCliente(): void {
    this.router.navigate(['/clientes/nuevo']);
  }

  editarCliente(id: number): void {
    this.router.navigate(['/clientes/editar', id]);
  }

  crearFaena(clienteId: number): void {
    this.router.navigate(['/pedidos/nuevo'], { queryParams: { clienteId: clienteId } });
  }

  eliminarCliente(id: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
      this.clienteService.deleteCliente(id).subscribe(
        () => {
          this.clientes = this.clientes.filter(c => c.id !== id);
        },
        (error) => {
          console.error('Error eliminando cliente:', error);
          alert('Error al eliminar cliente');
        }
      );
    }
  }
}
