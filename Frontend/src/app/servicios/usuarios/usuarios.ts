import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';


export interface Vehiculo {
  id_vehiculo?: number | string;
  placa?: string;
  tipoVehiculo: 'auto' | 'moto' | 'bici' | 'patin' | 'electr' | string;
  marca?: string;
  modelo?: string;
}

export interface PerfilUsuario {
  id_usuario?: number | string;
  nombre_completo: string;
  ficha?: string;
  telefono?: string;
  direccion?: string;
  correo?: string;
  rol?: string;
  estado?: boolean;
}

export interface HistorialPersonal {
  id_acceso?: number;
  movimiento: 'entrada' | 'salida' | string;
  fecha: string;
  hora: string;
  autorizado: boolean;
}

export interface CambiarPasswordPayload {
  actual?: string;
  nueva?: string;
  confirmar?: string;
  password_actual?: string;
  password_nueva?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('accesos') || localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    };
  }


  obtenerTodosLosVehiculos(): Observable<Vehiculo[]> {
    return this.http.get<Vehiculo[]>(`${this.apiUrl}/usuarios/vehiculos/todos/`, this.getAuthHeaders()).pipe(
      catchError(this.handleError)
    );
  }

  agregarVehiculo(data: Vehiculo): Observable<Vehiculo> {
    return this.http.post<Vehiculo>(`${this.apiUrl}/usuarios/vehiculos/agregar/`, data, this.getAuthHeaders()).pipe(
      catchError(this.handleError)
    );
  }

  actualizarVehiculo(id: number | string, data: Partial<Vehiculo>): Observable<Vehiculo> {
    return this.http.put<Vehiculo>(`${this.apiUrl}/usuarios/vehiculos/actualizar/${id}/`, data, this.getAuthHeaders()).pipe(
      catchError(this.handleError)
    );
  }

  eliminarVehiculo(id: number | string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/usuarios/vehiculos/eliminar/${id}/`, this.getAuthHeaders()).pipe(
      catchError(this.handleError)
    );
  }


  getUsuarios(): Observable<PerfilUsuario[]> { 
    return this.http.get<PerfilUsuario[]>(`${this.apiUrl}/admin/usuarios-pendientes/`, this.getAuthHeaders()).pipe(
      catchError(this.handleError)
    ); 
  }

  deleteUsuario(id: number | string): Observable<any> { 
    return this.http.delete<any>(`${this.apiUrl}/usuarios/${id}/`, this.getAuthHeaders()).pipe(
      catchError(this.handleError)
    ); 
  }

  aprobarUsuario(id: number | string): Observable<PerfilUsuario> {
    return this.http.patch<PerfilUsuario>(`${this.apiUrl}/admin/aprobar-usuario/${id}/`, {}, this.getAuthHeaders()).pipe(
      catchError(this.handleError)
    );
  }

  rechazarUsuario(id: number | string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/admin/aprobar-usuario/${id}/`, this.getAuthHeaders()).pipe(
      catchError(this.handleError)
    );
  }

  updateMiPerfil(data: Partial<PerfilUsuario>): Observable<PerfilUsuario> {
    return this.http.put<PerfilUsuario>(`${this.apiUrl}/perfil/actualizar/`, data, this.getAuthHeaders()).pipe(
      catchError(this.handleError)
    );
  }

  obtenerMiHistorial(): Observable<HistorialPersonal[]> {
    return this.http.get<HistorialPersonal[]>(`${this.apiUrl}/usuarios/historial/mio/`, this.getAuthHeaders()).pipe(
      catchError(this.handleError)
    );
  }

  cambiarPassword(data: CambiarPasswordPayload): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.apiUrl}/perfil/cambiar-password/`, data, this.getAuthHeaders()).pipe(
      catchError(this.handleError)
    );
  }
  private handleError(error: HttpErrorResponse): Observable<never> {
    let mensaje = 'Ocurrió un error al procesar la solicitud del usuario.';

    if (error.error instanceof ErrorEvent) {
      mensaje = `Error de conexión: ${error.error.message}`;
    } else {
      if (error.error && typeof error.error === 'object') {
        mensaje = error.error.detail || error.error.mensaje || JSON.stringify(error.error);
      } else {
        mensaje = `Código HTTP ${error.status}: ${error.statusText}`;
      }
    }

    return throwError(() => new Error(mensaje));
  }
}