import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, from, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { IndexedDb } from '../indexed/indexed-db';

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

  constructor(private http: HttpClient, private indexedDb: IndexedDb) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access') || localStorage.getItem('accesos') || localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getAccesosHoy(): Observable<AccesoHoy[]> {
    return this.http.get<AccesoHoy[]>(`${this.apiUrl}/accesos/`, { headers: this.getHeaders() }).pipe(
      tap(accesos => {
        this.indexedDb.setCache('accesos_hoy', accesos);
      }),
      catchError(error => {
        if (error.status === 0 || error.status === 504) {
          return from(this.indexedDb.getCache('accesos_hoy').then(data => data || []));
        }
        return throwError(() => error);
      })
    );
  }

  registrarAccesoManual(datos: RegistroAccesoManualPayload): Observable<AccesoHoy> {
    return this.http.post<AccesoHoy>(`${this.apiUrl}/accesos/`, datos, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        if (error.status === 0 || error.status === 504) {
          const fakeResponse: AccesoHoy = {
            id_acceso: Date.now(),
            placa: datos.placa || datos.placa_vehiculo_input || 'N/A',
            tipo_movimiento: datos.tipo_movimiento,
            fecha_hora: new Date().toISOString(),
            autorizado: true,
            observaciones: 'Guardado offline (Manual)'
          };
          this.indexedDb.addSyncItem({
            type: 'registrarAccesoManual',
            payload: datos,
            fakeId: fakeResponse.id_acceso
          });
          return of(fakeResponse);
        }
        return throwError(() => error);
      })
    );
  }

  registrarAcceso(vehiculoId: number | string, tipoMovimiento: 'ENTRADA' | 'SALIDA'): Observable<AccesoHoy> {
    const body = {
      vehiculo: vehiculoId,
      tipo_movimiento: tipoMovimiento
    };
    return this.http.post<AccesoHoy>(`${this.apiUrl}/accesos/`, body, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        if (error.status === 0 || error.status === 504) {
          const fakeResponse: AccesoHoy = {
            id_acceso: Date.now(),
            tipo_movimiento: tipoMovimiento,
            fecha_hora: new Date().toISOString(),
            autorizado: true,
            observaciones: 'Guardado offline'
          };
          this.indexedDb.addSyncItem({
            type: 'registrarAcceso',
            payload: body,
            fakeId: fakeResponse.id_acceso
          });
          return of(fakeResponse);
        }
        return throwError(() => error);
      })
    );
  }

  enviarInformeTurno(fechaInicio: string, observaciones: string, sinNovedad: boolean): Observable<RespuestaInformeTurno> {
    const body = {
      fecha_hora_inicio: fechaInicio,
      novedades_observaciones: observaciones,
      entrega_sin_novedad: sinNovedad
    };
    return this.http.post<RespuestaInformeTurno>(`${this.apiUrl}/informes-turno/`, body, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        if (error.status === 0 || error.status === 504) {
          const fakeResponse: RespuestaInformeTurno = {
            mensaje: 'Informe guardado offline'
          };
          this.indexedDb.addSyncItem({
            type: 'enviarInformeTurno',
            payload: body
          });
          return of(fakeResponse);
        }
        return throwError(() => error);
      })
    );
  }

  validarAccesoPorteria(payload: ValidarPorteriaPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/accesos/validar-porteria/`, payload, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  async sincronizarPendientes(): Promise<void> {
    const items = await this.indexedDb.getAllSyncItems();
    if (items.length === 0) return;

    for (const item of items) {
      try {
        let req$: Observable<any>;
        if (item.type === 'registrarAccesoManual') {
          req$ = this.http.post(`${this.apiUrl}/accesos/`, item.payload, { headers: this.getHeaders() });
        } else if (item.type === 'registrarAcceso') {
          req$ = this.http.post(`${this.apiUrl}/accesos/`, item.payload, { headers: this.getHeaders() });
        } else if (item.type === 'enviarInformeTurno') {
          req$ = this.http.post(`${this.apiUrl}/informes-turno/`, item.payload, { headers: this.getHeaders() });
        } else {
          continue; 
        }

        await new Promise((resolve, reject) => {
          req$.subscribe({
            next: () => resolve(true),
            error: (err) => {
              if (err.status === 0 || err.status === 504) {
                reject(err);
              } else {
                resolve(false); 
              }
            }
          });
        });
        await this.indexedDb.removeSyncItem(item.id);
      } catch (e) {
        console.error('Error sincronizando item:', item, e);
        break; 
      }
    }
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }
}