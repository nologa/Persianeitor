import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClienteService } from '../../../services/cliente.service';

@Component({
  selector: 'app-clientes-form',
  templateUrl: './clientes-form.component.html',
  styleUrls: ['./clientes-form.component.css']
})
export class ClientesFormComponent implements OnInit {
  form!: FormGroup;
  isEditing = false;
  loading = false;
  error = '';
  clienteId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private clienteService: ClienteService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.clienteId = +params['id'];
        this.isEditing = true;
        this.loadCliente(this.clienteId!);
      }
    });
  }

  initForm(): void {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.email]],
      telefono: [''],
      direccion: [''],
      ciudad: [''],
      codigoPostal: ['']
    });
  }

  loadCliente(id: number): void {
    this.loading = true;
    this.clienteService.getCliente(id).subscribe(
      (data) => {
        this.form.patchValue(data);
        this.loading = false;
      },
      (error) => {
        console.error('Error cargando cliente:', error);
        this.error = 'Error al cargar cliente';
        this.loading = false;
      }
    );
  }

  onSubmit(): void {
    if (this.form.invalid) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    this.loading = true;
    const formData = this.form.value;

    if (this.isEditing && this.clienteId) {
      this.clienteService.updateCliente(this.clienteId, formData).subscribe(
        () => {
          alert('Cliente actualizado correctamente');
          this.router.navigate(['/clientes']);
        },
        (error) => {
          console.error('Error actualizando cliente:', error);
          this.error = 'Error al actualizar cliente';
          this.loading = false;
        }
      );
    } else {
      this.clienteService.createCliente(formData).subscribe(
        () => {
          alert('Cliente creado correctamente');
          this.router.navigate(['/clientes']);
        },
        (error) => {
          console.error('Error creando cliente:', error);
          this.error = 'Error al crear cliente';
          this.loading = false;
        }
      );
    }
  }

  cancel(): void {
    this.router.navigate(['/clientes']);
  }
}
