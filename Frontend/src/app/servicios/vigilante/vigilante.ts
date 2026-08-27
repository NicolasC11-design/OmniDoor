import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AccesoHoy {
  id_acceso?: number;
  placa?: string;
  usuario?: string;
  tipo_movimiento: 'ENTRADA' | 'SALIDA' | string;
  fecha_hora: string;
  autorizado: boolean;
  observaciones?: string;
}

export interface RegistroAccesoManualPayload {
  tipo_movimiento: 'ENTRADA' | 'SALIDA' | string;
  vehiculo?: number | string | null;
  placa_vehiculo_input?: string;
  tipo_vehiculo_input?: string;
  nombre_conductor_input?: string;
  motivo_input?: string;
  placa?: string;
  documento_identidad?: string;
  observaciones?: string;
}

export interface ValidarPorteriaPayload {
  placa?: string;
  vector_biometrico?: number[];
  id_usuario?: number | string;
  tipo_movimiento: 'ENTRADA' | 'SALIDA' | string;
}

export interface InformeTurnoPayload {
  fecha_hora_inicio: string;
  novedades_observaciones: string;
  entrega_sin_novedad: boolean;
}

export interface RespuestaInformeTurno {
  mensaje: string;
  total_entradas?: number;
  vehiculos_quedados?: number;
}

@Injectable({
  providedIn: 'root'
})
export class VigilanteService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access') || localStorage.getItem('accesos') || localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
  getAccesosHoy(): Observable<AccesoHoy[]> {
    return this.http.get<AccesoHoy[]>(`${this.apiUrl}/accesos/`, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }
  registrarAccesoManual(datos: RegistroAccesoManualPayload): Observable<AccesoHoy> {
    return this.http.post<AccesoHoy>(`${this.apiUrl}/accesos/`, datos, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }
  registrarAcceso(vehiculoId: number | string, tipoMovimiento: 'ENTRADA' | 'SALIDA'): Observable<AccesoHoy> {
    const body = {
      vehiculo: vehiculoId,
      tipo_movimiento: tipoMovimiento
    };
    return this.http.post<AccesoHoy>(`${this.apiUrl}/accesos/`, body, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  enviarInformeTurno(fechaInicio: string, observaciones: string, sinNovedad: boolean): Observable<RespuestaInformeTurno> {
    const body = {
      fecha_hora_inicio: fechaInicio,
      novedades_observaciones: observaciones,
      entrega_sin_novedad: sinNovedad
    };
    return this.http.post<RespuestaInformeTurno>(`${this.apiUrl}/informes-turno/`, body, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }
  validarAccesoPorteria(payload: ValidarPorteriaPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/accesos/validar-porteria/`, payload, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }
}