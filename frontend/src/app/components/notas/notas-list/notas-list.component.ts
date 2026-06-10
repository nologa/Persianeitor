import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NotasService } from '../../../services/notas.service';
import { SyncService } from '../../../services/sync.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-notas-list',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './notas-list.component.html',
  styleUrls: ['./notas-list.component.css']
})
export class NotasListComponent implements OnInit, OnDestroy {
  notas: any[] = [];
  loading = true;
  error = '';

  private destroy$ = new Subject<void>();
  private draggedIndex: number | null = null;

  constructor(
    private notasService: NotasService,
    private syncService: SyncService,
    private router: Router,
    private confirmDialog: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    this.loadNotas();

    this.notasService.notasChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadNotas();
      });

    this.syncService.syncComplete$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadNotas();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNotas(): void {
    this.loading = true;
    this.notasService.getNotas().subscribe(
      (data) => {
        this.notas = data || [];
        this.loading = false;
      },
      (error) => {
        this.error = 'Error al cargar notas';
        this.loading = false;
      }
    );
  }



  nuevaNota(): void {
    this.router.navigate(['/notas/nueva']);
  }

  editarNota(id: number): void {
    this.router.navigate(['/notas/editar', id]);
  }

  eliminarNota(id: number): void {
    this.confirmDialog.confirm({
      title: 'Eliminar nota',
      message: '¿Estás seguro de que deseas eliminar esta nota? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    }).subscribe(result => {
      if (result) {
        this.notasService.deleteNota(id).subscribe(() => {
          this.notas = this.notas.filter(n => n.id !== id);
        });
      }
    });
  }
}