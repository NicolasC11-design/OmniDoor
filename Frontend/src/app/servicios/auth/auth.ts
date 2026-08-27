import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface Usuario {
  id_usuario: string;
  nombre_completo: string;
  correo: string;
  rol: string;
  estado: boolean;
  ficha?: string;
}

export interface AuthResponse {
  access?: string;
  refresh?: string;
  usuario?: Usuario;
  multiple_matches?: boolean;
  cuentas?: Usuario[];
  mensaje?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  register(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register/`, payload);
  }

  login(credentials: any): Observable<AuthResponse> {
    const endpoint = credentials.vector_biometrico
      ? `${this.apiUrl}/auth/login-biometrico/`
      : `${this.apiUrl}/auth/login/`;

    return this.http.post<AuthResponse>(endpoint, credentials).pipe(
      tap(response => {
        if (response?.access && response?.refresh) {
          localStorage.setItem('access', response.access);
          localStorage.setItem('refresh', response.refresh);
          if (response.usuario) {
            localStorage.setItem('usuario', JSON.stringify(response.usuario));
          }
        }
      })
    );
  }

  actualizarPerfil(datos: Partial<Usuario>): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/perfil/actualizar/`, datos, { headers: this.getHeaders() });
  }

  cambiarPassword(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/perfil/cambiar-password/`, payload, { headers: this.getHeaders() });
  }

  getMiHistorial(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios/historial/mio/`, { headers: this.getHeaders() });
  }

  getEstadisticasAdmin(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/stats/`, { headers: this.getHeaders() });
  }

  getUsuariosPendientes(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/admin/usuarios-pendientes/`, { headers: this.getHeaders() });
  }

  aprobarUsuario(idUsuario: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/admin/aprobar-usuario/${idUsuario}/`, {}, { headers: this.getHeaders() });
  }

  rechazarUsuario(idUsuario: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/aprobar-usuario/${idUsuario}/`, { headers: this.getHeaders() });
  }

  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/usuarios/`, { headers: this.getHeaders() });
  }

  actualizarUsuarioAdmin(idUsuario: string, datos: any): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/usuarios/${idUsuario}/`,
      datos,
      { headers: this.getHeaders() }
    );
  }

  eliminarUsuarioAdmin(idUsuario: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/usuarios/${idUsuario}/`,
      { headers: this.getHeaders() }
    );
  }

  getHistorialGeneral(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/accesos/`, { headers: this.getHeaders() });
  }

  actualizarVehiculoAdmin(idVehiculo: string, datos: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/vehiculos/${idVehiculo}/`, datos, { headers: this.getHeaders() });
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access');
  }

  getUsuarioActual(): Usuario | null {
    const userStr = localStorage.getItem('usuario');
    return userStr ? JSON.parse(userStr) : null;
  }

  getRol(): string | null {
    const user = this.getUsuarioActual();
    return user ? user.rol : null;
  }

  logout(): void {
    localStorage.clear();
  }
}