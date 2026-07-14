import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './environment';

@Injectable({
  providedIn: 'root'
})
export class ContabilidadService {
  private apiUrl = `${environment.apiUrl}/contabilidad`;

  constructor(private http: HttpClient) { }

  getResumenMensual(year?: string): Observable<any[]> {
    let url = `${this.apiUrl}/resumen-mensual`;
    if (year) {
      url += `?year=${year}`;
    }
    return this.http.get<any[]>(url);
  }
}