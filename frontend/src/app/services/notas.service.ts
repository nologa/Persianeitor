import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http'; // Importa HttpResponse
import { Observable, from, Subject, of } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
import { IndexedDbService } from './indexed-db.service';
import { SyncService } from './sync.service';

@Injectable({
  providedIn: 'root'
})
export class NotasService {
  private apiUrl = 'http://localhost:3001/api/notas';
  private notasChanged = new Subject<void>();
  notasChanged$ = this.notasChanged.asObservable();

  constructor(
    private http: HttpClient,
    private idb: IndexedDbService,
    private sync: SyncService
  ) {}

  getNotas(): Observable<any[]> {
    // Siempre empezamos obteniendo las notas de IndexedDB
    return from(this.idb.getAll('notas')).pipe(
      switchMap(indexedDbNotas => {
        // Si estamos online, intentamos sincronizar con el backend
        if (this.sync.isConnectionOnline()) {
          return this.http.get<any[]>(this.apiUrl, { observe: 'response' }).pipe(
            switchMap(async (response: HttpResponse<any[]>) => {
              if (response.status === 200 && response.body && Array.isArray(response.body)) {
                const apiNotas = response.body;
                // Limpiamos IndexedDB antes de guardar para evitar duplicados y datos obsoletos
                await this.idb.clear('notas');
                for (const nota of apiNotas) {
                  await this.idb.save('notas', nota);
                }
                // Devolvemos siempre el estado actual de IndexedDB después de la sincronización
                return await this.idb.getAll('notas');
              } else if (response.status === 304) {
                return indexedDbNotas;
              } else {
                return indexedDbNotas;
              }
            }),
            catchError((err) => {
              return of(indexedDbNotas);
            })
          );
        } else {
          return of(indexedDbNotas);
        }
      })
    );
  }

  getNota(id: number): Observable<any> {
    if (this.sync.isConnectionOnline()) {
      return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
        switchMap(async (data) => {
          await this.idb.save('notas', data);
          return data;
        }),
        catchError(() => from(this.idb.getById('notas', id)))
      );
    }
    return from(this.idb.getById('notas', id));
  }

  createNota(nota: any): Observable<any> {
    if (this.sync.isConnectionOnline()) {
      return this.http.post<any>(this.apiUrl, nota).pipe(
        switchMap(async (data) => {
          await this.idb.save('notas', data);
          this.notasChanged.next();
          return data;
        }),
        catchError(async () => {
          await this.sync.addToSyncQueue('notas', 'create', 0, nota);
          return nota;
        })
      );
    }
    return from(this.idb.save('notas', nota).then(async () => {
      await this.sync.addToSyncQueue('notas', 'create', 0, nota);
      this.notasChanged.next();
      return nota;
    }));
  }

  updateNota(id: number, nota: any): Observable<any> {
    if (this.sync.isConnectionOnline()) {
      return this.http.put<any>(`${this.apiUrl}/${id}`, nota).pipe(
        switchMap(async () => {
          nota.id = id;
          await this.idb.save('notas', nota);
          this.notasChanged.next();
          return nota;
        }),
        catchError(async () => {
          await this.sync.addToSyncQueue('notas', 'update', id, nota);
          return nota;
        })
      );
    }
    return from(this.idb.save('notas', { ...nota, id }).then(async () => {
      await this.sync.addToSyncQueue('notas', 'update', id, nota);
      this.notasChanged.next();
      return nota;
    }));
  }

  deleteNota(id: number): Observable<any> {
    if (this.sync.isConnectionOnline()) {
      return this.http.delete(`${this.apiUrl}/${id}`).pipe(
        switchMap(async () => {
          await this.idb.delete('notas', id);
          this.notasChanged.next();
          return { success: true };
        }),
        catchError(async () => {
          await this.sync.addToSyncQueue('notas', 'delete', id, {});
          return { success: true };
        })
      );
    }
    return from(this.idb.delete('notas', id).then(async () => {
      await this.sync.addToSyncQueue('notas', 'delete', id, {});
      this.notasChanged.next();
      return { success: true };
    }));
  }
}
