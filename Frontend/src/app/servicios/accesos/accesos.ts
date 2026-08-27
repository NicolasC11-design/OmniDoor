import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ValidarAccesoPayload {
  placa?: string;
  vector_biometrico: number[];
  tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'APERTURA_MANUAL' | 'DENEGADO';
}

export interface RespuestaAcceso {
  mensaje: string;
  autorizado?: boolean;
  usuario?: {
    id_usuario: string;
    nombre_completo: string;
    rol: string;
    correo: string;
  };
  vehiculo?: string;
  fecha_hora?: string;
}

export interface NovedadAccesoPayload {
  placa_manual?: string;
  tipo_vehiculo_manual?: string;
  nombre_conductor_manual?: string;
  motivo_apertura: string;
  tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'APERTURA_MANUAL';
}

export interface RegistroHistorial {
  id_registro?: string; // UUID devuelto por Django
  usuario?: string | null;
  nombre_usuario?: string;
  vehiculo?: string | null;
  placa_vehiculo?: string;
  placa_manual?: string;
  tipo_vehiculo_manual?: string;
  nombre_conductor_manual?: string;
  motivo_apertura?: string;
  tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'APERTURA_MANUAL' | 'DENEGADO';
  fecha_hora: string;
  vigilante?: string;
}

export interface RespuestaNovedad {
  mensaje: string;
  id_registro?: string;
  exito: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AccesoService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  validarAccesoPorteria(payload: ValidarAccesoPayload): Observable<RespuestaAcceso> {
    return this.http.post<RespuestaAcceso>(`${this.apiUrl}/validar-acceso-porteria/`, payload).pipe(
      catchError(this.handleError)
    );
  }

  obtenerHistorialAccesos(): Observable<RegistroHistorial[]> {
    return this.http.get<RegistroHistorial[]>(`${this.apiUrl}/historial-accesos/`).pipe(
      catchError(this.handleError)
    );
  }

  registrarNovedadManual(payload: NovedadAccesoPayload): Observable<RespuestaNovedad> {
    return this.http.post<RespuestaNovedad>(`${this.apiUrl}/registro-novedad-manual/`, payload).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let mensaje = 'Ocurrió un error al procesar el acceso en el servidor.';

    if (error.error instanceof ErrorEvent) {
      mensaje = `Error de cliente o red: ${error.error.message}`;
    } else if (error.error && typeof error.error === 'object') {
      mensaje = error.error.detail || error.error.mensaje || JSON.stringify(error.error);
    } else {
      mensaje = `Código de error HTTP: ${error.status} - ${error.statusText}`;
    }

    return throwError(() => new Error(mensaje));
  }
}