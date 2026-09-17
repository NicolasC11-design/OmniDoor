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



import { IndexedDb } from '../indexed/indexed-db';
import { tap, from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl || 'http://127.0.0.1:8000/api'}`;

  constructor(private http: HttpClient, private indexedDb: IndexedDb) {}

  obtenerEstadisticas(): Observable<EstadisticaSistema> {
    return this.http.get<EstadisticaSistema>(`${this.apiUrl}/admin/stats/`).pipe(
      tap(data => this.indexedDb.setCache('admin_stats', data)),
      catchError(error => {
        if (error.status === 0 || error.status === 504) {
          return from(this.indexedDb.getCache('admin_stats').then(data => data || {
            total_usuarios: 0, usuarios_activos: 0, accesos_hoy: 0, vehiculos_registrados: 0
          }));
        }
        return this.handleError(error);
      })
    );
  }

  obtenerTodosLosUsuarios(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(`${this.apiUrl}/usuarios/`).pipe(
      tap(data => this.indexedDb.setCache('admin_usuarios', data)),
      catchError(error => {
        if (error.status === 0 || error.status === 504) {
          return from(this.indexedDb.getCache('admin_usuarios').then(data => data || []));
        }
        return this.handleError(error);
      })
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

  obtenerInformesTurno(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/informes-turno/`).pipe(
      tap(data => this.indexedDb.setCache('admin_informes', data)),
      catchError(error => {
        if (error.status === 0 || error.status === 504) {
          return from(this.indexedDb.getCache('admin_informes').then(data => data || []));
        }
        return this.handleError(error);
      })
    );
  }
}