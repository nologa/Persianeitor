import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, Subject } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { IndexedDbService } from './indexed-db.service';
import { SyncService } from './sync.service';
import { environment } from './environment';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private apiUrl = `${environment.apiUrl}/pedidos`;
  private pedidosChanged = new Subject<void>();
  pedidosChanged$ = this.pedidosChanged.asObservable();

  constructor(
    private http: HttpClient,
    private idb: IndexedDbService,
    private sync: SyncService
  ) {}

  // Obtener pedidos
  getPedidos(): Observable<any[]> {
    if (this.sync.isConnectionOnline()) {
      return this.http.get<any[]>(this.apiUrl).pipe(
        switchMap(async (data) => {
          for (const pedido of data) {
            await this.idb.save('pedidos', pedido);
          }
          return data;
        }),
        catchError(() => from(this.idb.getAll('pedidos')))
      );
    } else {
      return from(this.idb.getAll('pedidos'));
    }
  }

  // Obtener pedidos siempre desde el backend (ignorar caché offline)
  getPedidosDesdeBackend(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      switchMap(async (data) => {
        for (const pedido of data) {
          await this.idb.save('pedidos', pedido);
        }
        return data;
      }),
      catchError(() => from(this.idb.getAll('pedidos')))
    );
  }

  // Obtener pedido por ID
  getPedido(id: number): Observable<any> {
    if (this.sync.isConnectionOnline()) {
      return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
        switchMap(async (data) => {
          await this.idb.save('pedidos', data);
          return data;
        }),
        catchError(() => from(this.idb.getById('pedidos', id)))
      );
    } else {
      return from(this.idb.getById('pedidos', id));
    }
  }

  // Crear pedido
  createPedido(pedido: any): Observable<any> {
    if (this.sync.isConnectionOnline()) {
      return this.http.post<any>(this.apiUrl, pedido).pipe(
        switchMap(async (data) => {
          await this.idb.save('pedidos', data);
          return data;
        }),
        tap(() => this.pedidosChanged.next()),
        catchError(async (error) => {
          await this.sync.addToSyncQueue('pedidos', 'create', 0, pedido);
          return pedido;
        })
      );
    } else {
      return from(this.idb.save('pedidos', pedido).then(async () => {
        await this.sync.addToSyncQueue('pedidos', 'create', 0, pedido);
        this.pedidosChanged.next();
        return pedido;
      }));
    }
  }

  // Actualizar pedido
  updatePedido(id: number, pedido: any): Observable<any> {
    if (this.sync.isConnectionOnline()) {
      return this.http.put<any>(`${this.apiUrl}/${id}`, pedido).pipe(
        switchMap(async () => {
          pedido.id = id;
          await this.idb.save('pedidos', pedido);
          return pedido;
        }),
        tap(() => this.pedidosChanged.next()),
        catchError(async (error) => {
          await this.sync.addToSyncQueue('pedidos', 'update', id, pedido);
          return pedido;
        })
      );
    } else {
      return from(this.idb.save('pedidos', { ...pedido, id }).then(async () => {
        await this.sync.addToSyncQueue('pedidos', 'update', id, pedido);
        this.pedidosChanged.next();
        return pedido;
      }));
    }
  }

  // Eliminar pedido
  deletePedido(id: number): Observable<any> {
    if (this.sync.isConnectionOnline()) {
      return this.http.delete(`${this.apiUrl}/${id}`).pipe(
        switchMap(async () => {
          await this.idb.delete('pedidos', id);
          return { success: true };
        }),
        tap(() => this.pedidosChanged.next()),
        catchError(async (error) => {
          await this.sync.addToSyncQueue('pedidos', 'delete', id, {});
          return { success: true };
        })
      );
    } else {
      return from(this.idb.delete('pedidos', id).then(async () => {
        await this.sync.addToSyncQueue('pedidos', 'delete', id, {});
        this.pedidosChanged.next();
        return { success: true };
      }));
    }
  }
}
