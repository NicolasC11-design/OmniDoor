import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VigilanteService {
  private apiUrl = 'http://127.0.0.1:8000/api'; 

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getAccesosHoy(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/accesos/`, { headers: this.getHeaders() });
  }

  registrarAccesoManual(datos: any) {
    return this.http.post<any>(`${this.apiUrl}/accesos/`, datos); 
}

  registrarAcceso(vehiculoId: string, tipoMovimiento: 'ENTRADA' | 'SALIDA'): Observable<any> {
    const body = {
      vehiculo: vehiculoId,
      tipo_movimiento: tipoMovimiento
    };
    return this.http.post<any>(`${this.apiUrl}/accesos/`, body, { headers: this.getHeaders() });
  }

  enviarInformeTurno(fechaInicio: string, observaciones: string, sinNovedad: boolean): Observable<any> {
    const body = {
      fecha_hora_inicio: fechaInicio,
      novedades_observaciones: observaciones,
      entrega_sin_novedad: sinNovedad
    };
    return this.http.post<any>(`${this.apiUrl}/informes-turno/`, body, { headers: this.getHeaders() });
  }
}