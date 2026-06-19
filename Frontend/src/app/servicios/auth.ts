import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8000/api'; 

  constructor(private http: HttpClient) {}

  register(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register/`, payload);
  }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login/`, credentials).pipe(
      tap(response => {
        if (response && response.access) {
          localStorage.setItem('access', response.access);
          localStorage.setItem('refresh', response.refresh);
          
          if (response.usuario) {
            localStorage.setItem('usuario', JSON.stringify(response.usuario));
          }
        }
      })
    );
  }

  getUsuariosPendientes(): Observable<any[]> {
    const token = localStorage.getItem('access'); 
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<any[]>(`${this.apiUrl}/admin/usuarios-pendientes/`, { headers });
  }

  aprobarUsuario(idUsuario: string): Observable<any> {
    const token = localStorage.getItem('access'); 
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.patch<any>(`${this.apiUrl}/admin/aprobar-usuario/${idUsuario}/`, {}, { headers });
  }


  isAuthenticated(): boolean {
    const token = localStorage.getItem('access');
    return !!token; 
  }

  logout(): void {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('usuario');
  }
}