import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NotasService } from '../../../services/notas.service';

@Component({
  selector: 'app-notas-form',
  templateUrl: './notas-form.component.html',
  styleUrls: ['./notas-form.component.css']
})
export class NotasFormComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  error = '';
  notaId: number | null = null;
  colores = [
    { nombre: 'Amarillo', valor: '#F6F09F' },
    { nombre: 'Rosa', valor: '#FFB6C1' },
    { nombre: 'Verde', valor: '#BED4CB' },
    { nombre: 'Azul', valor: '#87B6BC' },
    { nombre: 'Naranja', valor: '#FFD700' },
    { nombre: 'Lavanda', valor: '#E6E6FA' }
  ];

  constructor(
    private fb: FormBuilder,
    private notasService: NotasService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.notaId = +params['id'];
        this.loadNota(this.notaId);
      }
    });
  }

  initForm(): void {
    this.form = this.fb.group({
      titulo: [''],
      contenido: ['', Validators.required],
      color: ['#F6F09F']
    });
  }

  loadNota(id: number): void {
    this.loading = true;
    this.notasService.getNota(id).subscribe(
      (data) => {
        this.form.patchValue({
          titulo: data.titulo || '',
          contenido: data.contenido || '',
          color: data.color || '#F6F09F'
        });
        this.loading = false;
      },
      (error) => {
        console.error('Error cargando nota:', error);
        this.error = 'Error al cargar la nota';
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

    if (this.notaId) {
      this.notasService.updateNota(this.notaId, formData).subscribe(
        () => {
          this.router.navigate(['/notas']);
        },
        (error) => {
          console.error('Error actualizando nota:', error);
          this.error = 'Error al actualizar la nota';
          this.loading = false;
        }
      );
    } else {
      this.notasService.createNota(formData).subscribe(
        () => {
          this.router.navigate(['/notas']);
        },
        (error) => {
          console.error('Error creando nota:', error);
          this.error = 'Error al crear la nota';
          this.loading = false;
        }
      );
    }
  }

  volver(): void {
    this.router.navigate(['/notas']);
  }
}
