import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, Subject } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { IndexedDbService } from './indexed-db.service';
import { SyncService } from './sync.service';

@Injectable({
  providedIn: 'root'
})
export class PedidoItemsService {
  private apiUrl = 'http://localhost:3001/api';
  private fabricaItemsChanged = new Subject<void>();
  fabricaItemsChanged$ = this.fabricaItemsChanged.asObservable();

  constructor(
    private http: HttpClient,
    private idb: IndexedDbService,
    private sync: SyncService
  ) {}

  getItemsByPedido(pedidoId: number): Observable<any[]> {
    if (this.sync.isConnectionOnline()) {
      return this.http.get<any[]>(`${this.apiUrl}/pedidos/${pedidoId}/items`).pipe(
        switchMap(async (data) => {
          for (const item of data) {
            await this.idb.save('pedidoItems', item);
          }
          return data;
        }),
        catchError(() => from(this.getItemsByPedidoOffline(pedidoId)))
      );
    }
    return from(this.getItemsByPedidoOffline(pedidoId));
  }

  getItemsFabrica(): Observable<any[]> {
    if (this.sync.isConnectionOnline()) {
      return this.http.get<any[]>(`${this.apiUrl}/fabrica/items`).pipe(
        switchMap(async (data) => {
          for (const item of data) {
            await this.idb.save('pedidoItems', item);
          }
          return data;
        }),
        catchError(() => from(this.getItemsFabricaOffline()))
      );
    }
    return from(this.getItemsFabricaOffline());
  }

  getItem(id: number): Observable<any> {
    if (this.sync.isConnectionOnline()) {
      return this.http.get<any>(`${this.apiUrl}/pedido-items/${id}`).pipe(
        switchMap(async (data) => {
          await this.idb.save('pedidoItems', data);
          return data;
        }),
        catchError(() => from(this.getItemOffline(id)))
      );
    }
    return from(this.getItemOffline(id));
  }

  createItem(item: any): Observable<any> {
    if (this.sync.isConnectionOnline()) {
      return this.http.post<any>(`${this.apiUrl}/pedido-items`, item).pipe(
        switchMap(async (data) => {
          await this.idb.save('pedidoItems', data);
          return data;
        }),
        tap(() => {
          // Notificar cambios en fábrica
          if (item.enPedidoFabrica === 1 || item.enPedidoFabrica === true) {
            this.fabricaItemsChanged.next();
          }
        }),
        catchError(async () => {
          await this.sync.addToSyncQueue('pedido-items', 'create', 0, item);
          return item;
        })
      );
    }
    return from(this.idb.save('pedidoItems', item).then(async () => {
      await this.sync.addToSyncQueue('pedido-items', 'create', 0, item);
      if (item.enPedidoFabrica === 1 || item.enPedidoFabrica === true) {
        this.fabricaItemsChanged.next();
      }
      return item;
    }));
  }

  updateItem(id: number, item: any): Observable<any> {
    if (this.sync.isConnectionOnline()) {
      return this.http.put<any>(`${this.apiUrl}/pedido-items/${id}`, item).pipe(
        switchMap(async () => {
          item.id = id;
          await this.idb.save('pedidoItems', item);
          return item;
        }),
        tap(() => {
          // Notificar si se cambió enPedidoFabrica
          if ('enPedidoFabrica' in item) {
            this.fabricaItemsChanged.next();
          }
        }),
        catchError(async () => {
          await this.sync.addToSyncQueue('pedido-items', 'update', id, item);
          return item;
        })
      );
    }
    return from(this.idb.save('pedidoItems', { ...item, id }).then(async () => {
      await this.sync.addToSyncQueue('pedido-items', 'update', id, item);
      if ('enPedidoFabrica' in item) {
        this.fabricaItemsChanged.next();
      }
      return item;
    }));
  }

  deleteItem(id: number): Observable<any> {
    if (this.sync.isConnectionOnline()) {
      return this.http.delete(`${this.apiUrl}/pedido-items/${id}`).pipe(
        switchMap(async () => {
          await this.idb.delete('pedidoItems', id);
          return { success: true };
        }),
        catchError(async () => {
          await this.sync.addToSyncQueue('pedido-items', 'delete', id, {});
          return { success: true };
        })
      );
    }
    return from(this.idb.delete('pedidoItems', id).then(async () => {
      await this.sync.addToSyncQueue('pedido-items', 'delete', id, {});
      return { success: true };
    }));
  }

  private async getItemsByPedidoOffline(pedidoId: number): Promise<any[]> {
    const all = await this.idb.getAll('pedidoItems');
    return all.filter(i => i.pedidoId === pedidoId);
  }

  private async getItemsFabricaOffline(): Promise<any[]> {
    const all = await this.idb.getAll('pedidoItems');
    return all.filter(i => i.enPedidoFabrica === 1 || i.enPedidoFabrica === true);
  }

  private async getItemOffline(id: number): Promise<any> {
    return await this.idb.getById('pedidoItems', id);
  }
}
