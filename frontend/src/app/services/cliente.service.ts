import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { IndexedDbService } from './indexed-db.service';
import { SyncService } from './sync.service';
import { of } from 'rxjs';
import { environment } from './environment';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private apiUrl = `${environment.apiUrl}/clientes`;

  constructor(
    private http: HttpClient,
    private idb: IndexedDbService,
    private sync: SyncService
  ) {}

  // Obtener clientes
  getClientes(): Observable<any[]> {
    if (this.sync.isConnectionOnline()) {
      return this.http.get<any[]>(this.apiUrl).pipe(
        switchMap(async (data) => {
          for (const cliente of data) {
            await this.idb.save('clientes', cliente);
          }
          return data;
        }),
        catchError(() => from(this.idb.getAll('clientes')))
      );
    } else {
      return from(this.idb.getAll('clientes'));
    }
  }

  // Obtener cliente por ID
  getCliente(id: number): Observable<any> {
    if (this.sync.isConnectionOnline()) {
      return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
        switchMap(async (data) => {
          await this.idb.save('clientes', data);
          return data;
        }),
        catchError(() => from(this.idb.getById('clientes', id)))
      );
    } else {
      return from(this.idb.getById('clientes', id));
    }
  }

  // Crear cliente
  createCliente(cliente: any): Observable<any> {
    if (this.sync.isConnectionOnline()) {
      return this.http.post<any>(this.apiUrl, cliente).pipe(
        switchMap(async (data) => {
          await this.idb.save('clientes', data);
          return data;
        }),
        catchError(async (error) => {
          await this.sync.addToSyncQueue('clientes', 'create', 0, cliente);
          return cliente;
        })
      );
    } else {
      return from(this.idb.save('clientes', cliente).then(async () => {
        await this.sync.addToSyncQueue('clientes', 'create', 0, cliente);
        return cliente;
      }));
    }
  }

  // Actualizar cliente
  updateCliente(id: number, cliente: any): Observable<any> {
    if (this.sync.isConnectionOnline()) {
      return this.http.put<any>(`${this.apiUrl}/${id}`, cliente).pipe(
        switchMap(async () => {
          cliente.id = id;
          await this.idb.save('clientes', cliente);
          return cliente;
        }),
        catchError(async (error) => {
          await this.sync.addToSyncQueue('clientes', 'update', id, cliente);
          return cliente;
        })
      );
    } else {
      return from(this.idb.save('clientes', { ...cliente, id }).then(async () => {
        await this.sync.addToSyncQueue('clientes', 'update', id, cliente);
        return cliente;
      }));
    }
  }

  // Eliminar cliente
  deleteCliente(id: number): Observable<any> {
    if (this.sync.isConnectionOnline()) {
      return this.http.delete(`${this.apiUrl}/${id}`).pipe(
        switchMap(async () => {
          await this.idb.delete('clientes', id);
          return { success: true };
        }),
        catchError(async (error) => {
          await this.sync.addToSyncQueue('clientes', 'delete', id, {});
          return { success: true };
        })
      );
    } else {
      return from(this.idb.delete('clientes', id).then(async () => {
        await this.sync.addToSyncQueue('clientes', 'delete', id, {});
        return { success: true };
      }));
    }
  }
}
