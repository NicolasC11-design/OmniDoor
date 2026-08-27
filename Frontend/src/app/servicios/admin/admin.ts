import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface EstadisticaSistema {
  total_usuarios: number;
  usuarios_activos: number;
  accesos_hoy: number;
  vehiculos_registrados: number;
  [key: string]: any;
}

export interface UsuarioAdmin {
  id_usuario?: number;
  id?: number | string;
  nombre_completo: string;
  correo: string;
  rol: string;
  ficha?: string;
  is_active: boolean;
  estado?: string;
}

export interface CambiarEstadoPayload {
  is_active: boolean;
  estado?: string;
}



@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl || 'http://127.0.0.1:8000/api'}`;

  constructor(private http: HttpClient) {}

  obtenerEstadisticas(): Observable<EstadisticaSistema> {
    return this.http.get<EstadisticaSistema>(`${this.apiUrl}/admin/stats/`).pipe(
      catchError(this.handleError)
    );
  }

  obtenerTodosLosUsuarios(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(`${this.apiUrl}/usuarios/`).pipe(
      catchError(this.handleError)
    );
  }

  cambiarEstadoUsuario(idUsuario: number | string, datos: CambiarEstadoPayload): Observable<UsuarioAdmin> {
    return this.http.patch<UsuarioAdmin>(`${this.apiUrl}/aprobar-usuario/${idUsuario}/`, datos).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ocurrió un error inesperado en el servidor.';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error de cliente: ${error.error.message}`;
    } else {
      if (error.error && typeof error.error === 'object') {
        errorMessage = error.error.detail || error.error.mensaje || JSON.stringify(error.error);
      } else {
        errorMessage = `Código HTTP: ${error.status} - ${error.statusText}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}