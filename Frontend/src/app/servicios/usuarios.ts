import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private url = 'http://localhost:8000/api/';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accesos');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  obtenerTodosLosVehiculos(): Observable<any> {
    return this.http.get(`${this.url}usuarios/vehiculos/todos/`, { headers: this.getHeaders() });
  }

  agregarVehiculo(data: any): Observable<any> {
    return this.http.post(`${this.url}usuarios/vehiculos/agregar/`, data, { headers: this.getHeaders() });
  }

  actualizarVehiculo(id: string, data: any): Observable<any> {
    return this.http.put(`${this.url}usuarios/vehiculos/actualizar/${id}/`, data, { headers: this.getHeaders() });
  }

  getUsuarios(): Observable<any> { 
    return this.http.get(`${this.url}admin/usuarios-pendientes/`, { headers: this.getHeaders() }); 
  }

  deleteUsuario(id: string): Observable<any> { 
    return this.http.delete(`${this.url}usuarios/${id}/`, { headers: this.getHeaders() }); 
  }

  rechazarUsuario(id: string): Observable<any> {
    return this.http.delete(`${this.url}admin/aprobar-usuario/${id}/`, { headers: this.getHeaders() });
  }

  aprobarUsuario(id: string): Observable<any> {
    return this.http.patch(`${this.url}admin/aprobar-usuario/${id}/`, {}, { headers: this.getHeaders() });
  }


  updateMiPerfil(data: any): Observable<any> {
    return this.http.put(`${this.url}perfil/actualizar/`, data, { headers: this.getHeaders() });
  }
}