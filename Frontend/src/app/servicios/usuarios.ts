import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private url = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  obtenerTodosLosVehiculos(): Observable<any> {
    const token = localStorage.getItem('accesos');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.get(`${this.url}/usuarios/vehiculos/todos/`, { headers });
  }

  agregarVehiculo(data: any): Observable<any> {
    const token = localStorage.getItem('accesos');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.post(`${this.url}/usuarios/vehiculos/agregar/`, data, { headers });
  }

  actualizarVehiculo(id: string, data: any): Observable<any> {
    const token = localStorage.getItem('accesos');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.put(`${this.url}/usuarios/vehiculos/actualizar/${id}/`, data, { headers });
  }

  eliminarVehiculo(id: string): Observable<any> {
    const token = localStorage.getItem('accesos');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.delete(`${this.url}/usuarios/vehiculos/eliminar/${id}/`, { headers });
  }

  getUsuarios(): Observable<any> { 
    const token = localStorage.getItem('accesos');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.get(`${this.url}/admin/usuarios-pendientes/`, { headers }); 
  }

  deleteUsuario(id: string): Observable<any> { 
    const token = localStorage.getItem('accesos');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.delete(`${this.url}/usuarios/${id}/`, { headers }); 
  }

  rechazarUsuario(id: string): Observable<any> {
    const token = localStorage.getItem('accesos');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.delete(`${this.url}/admin/aprobar-usuario/${id}/`, { headers });
  }

  aprobarUsuario(id: string): Observable<any> {
    const token = localStorage.getItem('accesos');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.patch(`${this.url}/admin/aprobar-usuario/${id}/`, {}, { headers });
  }

  updateMiPerfil(data: any): Observable<any> {
    const token = localStorage.getItem('accesos');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.put(`${this.url}/perfil/actualizar/`, data, { headers });
  }


  obtenerMiHistorial(): Observable<any> {
    const token = localStorage.getItem('accesos');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.get(`${this.url}/usuarios/historial/mio/`, { headers });
  }

cambiarPassword(data: any): Observable<any> {
    const token = localStorage.getItem('accesos');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.post(`${this.url}/perfil/cambiar-password/`, data, { headers });
  }
}

