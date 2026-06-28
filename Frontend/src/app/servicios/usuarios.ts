import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private url = 'http://localhost:8000/api/'; 

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('access');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getPerfil(): Observable<any> {
    return this.http.get(`${this.url}usuarios/perfil/`, { headers: this.getHeaders() });
  }

  updateMiPerfil(data: any): Observable<any> {
    return this.http.put(`${this.url}usuarios/perfil/`, data, { headers: this.getHeaders() });
  }

  agregarVehiculo(data: any): Observable<any> {
    return this.http.post(`${this.url}usuarios/vehiculos/agregar/`, data, { headers: this.getHeaders() });
  }

  cambiarPassword(data: any): Observable<any> {
    return this.http.post(`${this.url}usuarios/cambiar-password/`, data, { headers: this.getHeaders() });
  }
  obtenerHistorial(): Observable<any> {
    return this.http.get(`${this.url}usuarios/historial/`, { headers: this.getHeaders() });
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

  obtenerTodosLosVehiculos(): Observable<any> {

  const token = localStorage.getItem('access') || localStorage.getItem('token'); 
  
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`
  });

  return this.http.get('http://localhost:8000/api/usuarios/vehiculos/todos/', { headers });
}
}

