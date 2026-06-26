import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private url = 'http://localhost:8000/api/'; // Base general

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('access');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getUsuarios(): Observable<any> { 
    return this.http.get(`${this.url}admin/usuarios-pendientes/`, { headers: this.getHeaders() }); 
  }

  deleteUsuario(id: string): Observable<any> { 
    return this.http.delete(`${this.url}usuarios/${id}/`, { headers: this.getHeaders() }); 
  }

  updateMiPerfil(data: any): Observable<any> {
    return this.http.put(`${this.url}perfil/actualizar/`, data, { headers: this.getHeaders() });
  }

  aprobarUsuario(id: string): Observable<any> {
    return this.http.patch(`${this.url}admin/aprobar-usuario/${id}/`, {}, { headers: this.getHeaders() });
  }

  actualizarVehiculo(data: { placa: string, tipoVehiculo: string }): Observable<any> {
    return this.http.put(`${this.url}perfil/actualizar/`, data);
  }
}