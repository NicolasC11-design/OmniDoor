import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api'; 

  constructor(private http: HttpClient) {}
  
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  register(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register/`, payload);
  }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login/`, credentials).pipe(
      tap(response => {
        if (response?.access) {
          localStorage.setItem('access', response.access);
          localStorage.setItem('refresh', response.refresh);
          if (response.usuario) localStorage.setItem('usuario', JSON.stringify(response.usuario));
        }
      })
    );
  }


  getUsuariosPendientes(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/admin/usuarios-pendientes/`, { 
    headers: this.getHeaders() 
  });
}

  aprobarUsuario(idUsuario: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/admin/aprobar-usuario/${idUsuario}/`, {}, { headers: this.getHeaders() });
  }

  rechazarUsuario(idUsuario: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/aprobar-usuario/${idUsuario}/`, { headers: this.getHeaders() });
  }

  getEstadisticasAdmin(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/`);
  }

  getUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios/`);
  }

  getHistorialGeneral(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/accesos/`);
  }

  actualizarUsuarioAdmin(idUsuario: string, datos: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/usuarios/${idUsuario}/`, datos);
}

  actualizarVehiculoAdmin(idVehiculo: string, datos: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/vehiculos/${idVehiculo}/`, datos, { 
      headers: this.getHeaders() 
    });
}

  eliminarUsuarioAdmin(idUsuario: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/usuarios/${idUsuario}/`);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access'); 
  }

  logout(): void {
    localStorage.clear(); 
  }
}