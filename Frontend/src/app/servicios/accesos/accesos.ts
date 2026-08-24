import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ValidarAccesoPayload {
  placa?: string;
  vector_biometrico: number[];
  tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'APERTURA_MANUAL' | 'REGISTRO_VISITANTE';
}

export interface RespuestaAcceso {
  mensaje: string;
  usuario?: {
    nombre: string;
    rol: string;
    correo: string;
  };
  vehiculo?: string;
  hora?: string;
}

export interface NovedadAccesoPayload {
  placa?: string;
  documento_usuario?: string;
  motivo: string;
  tipo_movimiento: 'ENTRADA' | 'SALIDA';
}

@Injectable({
  providedIn: 'root'
})
export class AccesoService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  validarAccesoPorteria(payload: ValidarAccesoPayload): Observable<RespuestaAcceso> {
    return this.http.post<RespuestaAcceso>(`${this.apiUrl}/validar-acceso-porteria/`, payload);
  }

  obtenerHistorialAccesos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/historial-accesos/`);
}

  registrarNovedadManual(payload: NovedadAccesoPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/registro-novedad-manual/`, payload);
  }
}