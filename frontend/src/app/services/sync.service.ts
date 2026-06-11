import { Injectable } from '@angular/core';
import { isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, lastValueFrom, ReplaySubject } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { IndexedDbService } from './indexed-db.service';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  // En desarrollo usa localhost, en producción usa la URL de Render que configuraremos
  private apiUrl = isDevMode() 
    ? 'http://localhost:3001/api' 
    : 'https://tu-backend-en-render.onrender.com/api';
  private isOnline = navigator.onLine;

  private syncComplete = new ReplaySubject<void>(1);
  syncComplete$ = this.syncComplete.asObservable();

  constructor(
    private http: HttpClient,
    private idb: IndexedDbService
  ) {
    window.addEventListener('online', () => this.onlineHandler());
    window.addEventListener('offline', () => this.offlineHandler());
    if (this.isOnline) this.syncData(); // Sincronizar al cargar la app
  }

  private onlineHandler(): void {
    this.isOnline = true;
    this.processSyncQueue();
    this.syncData();
  }

  private offlineHandler(): void {
    this.isOnline = false;
  }

  // Verificar si estamos online
  isConnectionOnline(): boolean {
    return this.isOnline;
  }

  // Sincronizar datos del servidor a IndexedDB
  async syncData(): Promise<void> {
    if (!this.isOnline) return;

    try {
      // Sincronizar clientes
      const clientes = await lastValueFrom(this.http.get<any[]>(`${this.apiUrl}/clientes`));
      if (clientes) {
        await this.idb.clear('clientes'); // Limpiar antes de guardar para evitar duplicados
        for (const cliente of clientes) {
          await this.idb.save('clientes', cliente);
        }
      }

      // Sincronizar pedidos
      const pedidos = await lastValueFrom(this.http.get<any[]>(`${this.apiUrl}/pedidos`));
      if (pedidos) {
        await this.idb.clear('pedidos'); // Limpiar antes de guardar para evitar duplicados
        for (const pedido of pedidos) {
          await this.idb.save('pedidos', pedido);
        }
      }

      // Sincronizar materiales de pedidos
      const pedidoItems = await lastValueFrom(this.http.get<any[]>(`${this.apiUrl}/pedido-items`));
      if (pedidoItems) {
        await this.idb.clear('pedidoItems'); // Limpiar antes de guardar para evitar duplicados
        for (const item of pedidoItems) {
          await this.idb.save('pedidoItems', item);
        }
      }

      // Sincronizar notas
      const notas = await lastValueFrom(this.http.get<any[]>(`${this.apiUrl}/notas`));
      if (notas) {
        await this.idb.clear('notas'); // Limpiar antes de guardar para evitar duplicados
        for (const nota of notas) {
          await this.idb.save('notas', nota);
        }
      }

      this.syncComplete.next();
    } catch (error) {
      console.error('Error en sincronización:', error);
    }
  }

  // Agregar a cola de sincronización
  async addToSyncQueue(tabla: string, operacion: string, registroId: number, datos: any): Promise<void> {
    await this.idb.save('syncQueue', {
      tabla,
      operacion,
      registroId,
      datos,
      timestamp: new Date().getTime()
    });
  }

  // Procesar cola de sincronización cuando está online
  async processSyncQueue(): Promise<void> {
    if (!this.isOnline) return;

    try {
      const queue = await this.idb.getAll('syncQueue');
      for (const item of queue) {
        await this.processSyncItem(item);
      }
    } catch (error) {
      console.error('Error procesando cola de sincronización:', error);
    }
  }

  private async processSyncItem(item: any): Promise<void> {
    try {
      switch (item.operacion) {
        case 'create':
          await lastValueFrom(this.http.post(`${this.apiUrl}/${item.tabla}`, item.datos));
          break;
        case 'update':
          await lastValueFrom(this.http.put(`${this.apiUrl}/${item.tabla}/${item.registroId}`, item.datos));
          break;
        case 'delete':
          await lastValueFrom(this.http.delete(`${this.apiUrl}/${item.tabla}/${item.registroId}`));
          break;
      }
      await this.idb.delete('syncQueue', item.id);
    } catch (error) {
      console.error('Error procesando item de sincronización:', error);
    }
  }
}
