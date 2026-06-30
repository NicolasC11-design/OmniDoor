import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  obtenerEstadisticas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/stats/`);
  }

  obtenerTodosLosUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios/`);
  }

  cambiarEstadoUsuario(idUsuario: string, datos: { is_active: boolean, estado?: string }): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/aprobar-usuario/${idUsuario}/`, datos);
  }
}