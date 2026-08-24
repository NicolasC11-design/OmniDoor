import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccesoService, RespuestaAcceso } from '../../servicios/accesos/accesos';
import { BiometriaCamaraComponent } from '../biometria-camara/biometria-camara';

@Component({
  selector: 'app-control-accesos',
  standalone: true,
  imports: [CommonModule, FormsModule, BiometriaCamaraComponent],
  templateUrl: './control-accesos.html',
  styleUrls: ['./control-accesos.css']
})
export class ControlAccesosComponent {
  placaInput: string = '';
  tipoMovimiento: 'ENTRADA' | 'SALIDA' = 'ENTRADA';
  vectorBiometrico: number[] | null = null;
  
  cargando: boolean = false;
  mensajeRespuesta: string | null = null;
  errorRespuesta: string | null = null;
  datosUsuario: any = null;

  constructor(private accesoService: AccesoService) {}

  onRostroCapturado(vector: any): void {
  if (Array.isArray(vector)) {
    this.vectorBiometrico = vector;
  } else if (vector && vector.vector) {
    this.vectorBiometrico = vector.vector;
  } else {
    this.vectorBiometrico = vector;
  }
}

  procesarAcceso(): void {
    this.mensajeRespuesta = null;
    this.errorRespuesta = null;
    this.datosUsuario = null;

    if (!this.vectorBiometrico || this.vectorBiometrico.length === 0) {
      this.errorRespuesta = '⚠️ Debe capturar el rostro del conductor antes de procesar.';
      return;
    }

    this.cargando = true;

    const payload = {
      placa: this.placaInput.trim().toUpperCase() || 'PEATONAL',
      vector_biometrico: this.vectorBiometrico,
      tipo_movimiento: this.tipoMovimiento
    };

    this.accesoService.validarAccesoPorteria(payload).subscribe({
      next: (res: RespuestaAcceso) => {
        this.cargando = false;
        this.mensajeRespuesta = res.mensaje;
        this.datosUsuario = res.usuario;
      },
      error: (err) => {
        this.cargando = false;
        this.errorRespuesta = err.error?.mensaje || 'Error al validar el acceso en portería.';
      }
    });
  }
}