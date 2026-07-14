import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PedidoService } from '../../../services/pedido.service';
import { PedidoItemsService } from '../../../services/pedido-items.service';
import { ClienteService } from '../../../services/cliente.service';

@Component({
  selector: 'app-pedidos-form',
  templateUrl: './pedidos-form.component.html',
  styleUrls: ['./pedidos-form.component.css']
})
export class PedidosFormComponent implements OnInit {
  form!: FormGroup;
  itemForm!: FormGroup;
  isEditing = false;
  loading = false;
  error = '';
  pedidoId: number | null = null;
  clientes: any[] = [];
  items: any[] = [];
  itemsLoading = false;
  pendingItems: any[] = [];

  constructor(
    private fb: FormBuilder,
    private pedidoService: PedidoService,
    private pedidoItemsService: PedidoItemsService,
    private clienteService: ClienteService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.initForm();
    this.initItemForm();
  }

  ngOnInit(): void {
    this.loadClientes();
    
    // Verificar si hay fecha en los parámetros de query
    this.route.queryParams.subscribe(params => {
      if (params['fecha']) {
        this.form.get('fechaEntrega')?.setValue(params['fecha']);
      }
      if (params['clienteId']) {
        const clienteId = params['clienteId'];
        this.form.get('clienteId')?.setValue(clienteId); // Asignar el ID del cliente al campo clienteId

        // Cargar los datos del cliente para pre-rellenar el formulario
        this.clienteService.getCliente(clienteId).subscribe(
          (cliente) => {
            this.form.patchValue({
              nombre: cliente.nombre,
              direccion: cliente.direccion,
              telefono: cliente.telefono
            });
          },
          (error) => console.error('Error cargando cliente para pre-rellenar pedido:', error)
        );
      }
    });

    // Verificar si es edición
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.pedidoId = +params['id'];
        this.isEditing = true;
        this.loadPedido(this.pedidoId!);
        this.loadItems(this.pedidoId!);
      }
    });
  }

  initForm(): void {
    this.form = this.fb.group({
      clienteId: [''],
      nombre: ['', Validators.required],
      direccion: ['', Validators.required],
      telefono: ['', Validators.required],
      descripcion: ['', Validators.required],
      presupuesto: [''],
      estado: ['pendiente', Validators.required],
      fechaEntrega: [''],
      hora: ['']
    });
  }

  initItemForm(): void {
    this.itemForm = this.fb.group({
      tipo: ['mosquitera', Validators.required],
      producto: [''],
      ancho: [''],
      alto: [''],
      color: [''],
      material: [''],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      notas: ['']
    });
  }

  loadClientes(): void {
    this.clienteService.getClientes().subscribe(
      (data) => {
        this.clientes = data;
      },
      (error) => {
        console.error('Error cargando clientes:', error);
      }
    );
  }

  loadPedido(id: number): void {
    this.loading = true;
    this.pedidoService.getPedido(id).subscribe(
      (data) => {
        this.form.patchValue(data);
        this.loading = false;
      },
      (error) => {
        console.error('Error cargando pedido:', error);
        this.error = 'Error al cargar pedido';
        this.loading = false;
      }
    );
  }

  loadItems(pedidoId: number): void {
    this.itemsLoading = true;
    this.pedidoItemsService.getItemsByPedido(pedidoId).subscribe(
      (data) => {
        this.items = data;
        this.itemsLoading = false;
      },
      (error) => {
        console.error('Error cargando items:', error);
        this.itemsLoading = false;
      }
    );
  }

  addItem(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    const payload = {
      ...this.itemForm.value,
      enPedidoFabrica: 0
    };

    if (this.pedidoId) {
      this.pedidoItemsService.createItem({ ...payload, pedidoId: this.pedidoId }).subscribe(
        (item) => {
          this.items = [item, ...this.items];
          this.itemForm.reset({
            tipo: 'mosquitera',
            cantidad: 1
          });
        },
        (error) => {
          console.error('Error creando item:', error);
        }
      );
    } else {
      const tempItem = { ...payload, tempId: Date.now() + Math.random() };
      this.pendingItems = [tempItem, ...this.pendingItems];
      this.itemForm.reset({
        tipo: 'mosquitera',
        cantidad: 1
      });
    }
  }

  toggleFabrica(item: any): void {
    const actualizado = { ...item, enPedidoFabrica: item.enPedidoFabrica ? 0 : 1 };
    this.pedidoItemsService.updateItem(item.id, actualizado).subscribe(
      () => {
        this.items = this.items.map(i => i.id === item.id ? actualizado : i);
      },
      (error) => {
        console.error('Error actualizando item:', error);
      }
    );
  }

  deleteItem(itemId: number): void {
    if (!confirm('¿Eliminar este material?')) return;
    this.pedidoItemsService.deleteItem(itemId).subscribe(
      () => {
        this.items = this.items.filter(i => i.id !== itemId);
      },
      (error) => {
        console.error('Error eliminando item:', error);
      }
    );
  }

  togglePendingFabrica(item: any): void {
    item.enPedidoFabrica = item.enPedidoFabrica ? 0 : 1;
  }

  deletePendingItem(tempId: number): void {
    this.pendingItems = this.pendingItems.filter(i => i.tempId !== tempId);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    this.loading = true;
    let formData = this.form.value;
    
    // Convertir clienteId vacío a null
    if (!formData.clienteId || formData.clienteId === '') {
      formData.clienteId = null;
    }

    if (this.isEditing && this.pedidoId) {
      this.pedidoService.updatePedido(this.pedidoId, formData).subscribe(
        () => {
          alert('Pedido actualizado correctamente');
          this.router.navigate(['/pedidos', this.pedidoId]);
        },
        (error) => {
          console.error('Error actualizando pedido:', error);
          this.error = 'Error al actualizar pedido';
          this.loading = false;
        }
      );
    } else {
      this.pedidoService.createPedido(formData).subscribe(
        (created) => {
          const newId = created?.id;
          if (!newId) {
            this.error = 'No se pudo crear el pedido en el servidor';
            this.loading = false;
            return;
          }
          if (newId && this.pendingItems.length > 0) {
            const creates = this.pendingItems.map(item =>
              this.pedidoItemsService.createItem({
                ...item,
                pedidoId: newId,
                tempId: undefined
              })
            );
            forkJoin(creates).subscribe(
              () => {
                alert('Pedido creado correctamente');
                this.router.navigate(['/pedidos', newId]);
              },
              (error) => {
                console.error('Error creando materiales:', error);
                this.error = 'Error al crear materiales';
                this.loading = false;
              }
            );
          } else {
            alert('Pedido creado correctamente');
            this.router.navigate(['/pedidos', newId]);
          }
        },
        (error) => {
          console.error('Error creando pedido:', error);
          this.error = 'Error al crear pedido';
          this.loading = false;
        }
      );
    }
  }

  cancel(): void {
    this.router.navigate(['/pedidos']);
  }
}
