import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VigilanteService } from '../../servicios/vigilante/vigilante';
import { BiometriaCamaraComponent } from '../biometria-camara/biometria-camara';

export type TipoVehiculo = 'AUTO' | 'MOTO' | 'ELECTRICO' | 'PATIN' | 'BICICLETA';
export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'APERTURA_MANUAL' | 'ACCESO_DENEGADO';

export interface RegistroIngreso {
  vehiculo?: string;
  tipo_vehiculo?: string;
  tipo?: string;
  placa?: string;
  placa_vehiculo?: string;
  vehiculo_placa?: string;
  nombre_conductor?: string;
  conductor?: string;
  usuario?: string;
  nombre?: string;
  rol_acceso?: string;
  rol?: string;
  acreditacion?: string;
  tipo_usuario?: string;
  tipo_movimiento?: TipoMovimiento | string;
  movimiento?: TipoMovimiento | string;
  fecha_hora?: string;
  fecha?: string;
  hora_fecha?: string;
  hora?: string;
  timestamp?: string;
  created_at?: string;
}

@Component({
  selector: 'app-dashboard-vigilante',
  standalone: true,
  imports: [CommonModule, FormsModule, BiometriaCamaraComponent],
  templateUrl: './dashboard-vigilante.html',
  styleUrl: './dashboard-vigilante.css',
})
export class DashboardVigilante implements OnInit, OnDestroy {

  // Variables de Portería
  coincidenciasPorteria: any[] = [];
  vectorBiometricoCapturado: number[] | null = null;
  placaInput: string = '';
  tipoMovimientoSeleccionado: string = 'ENTRADA';

  // Estado General y Métricas
  online = true;
  ingresosHoy = 0;
  salidasHoy = 0;
  vehiculosDentro = 0;
  pendientesManual = 0;
  denegadosHoy = 0;

  // Visualización Alertas y Scanner
  estadoAcceso: 'idle' | 'ok' | 'deny' = 'idle';
  ultimoResultado: { placa: string; conductor: string; motivo?: string } | null = null;
  ultimosIngresos: RegistroIngreso[] = [];

  // Modales Control
  mostrarModalManual = false;
  mostrarModalVisitante = false;
  mostrarModalInforme = false;
  mostrarModalSeleccionCuentas = false;

  // Escaneo Biométrico
  modoEscaneoBiometrico = false;
  evaluandoBiometria = false;
  placaEscaneoInput = '';
  tipoMovimientoCamara: 'ENTRADA' | 'SALIDA' = 'ENTRADA';
  cuentasCoincidentes: any[] = [];
  vectorBiometricoPendiente: number[] = [];

  // Formularios Modales
  guardandoVisitante = false;
  guardandoManual = false;
  aperturaManual = { conductor: '', motivo: '', tipoVehiculo: 'AUTO' as TipoVehiculo, placa: '' };
  visitante = { nombre: '', tipoVehiculo: 'AUTO' as TipoVehiculo, placa: '' };

  // Fin de Turno
  novedadesTexto = '';
  sinNovedadCheck = true;
  horaInicioTurno!: string;

  private resetTimer: any = null;

  constructor(
    private router: Router,
    private vigilanteService: VigilanteService,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const savedTime = localStorage.getItem('horaInicioTurno');
    if (savedTime) {
      this.horaInicioTurno = savedTime;
    } else {
      const now = new Date();
      const offsetMs = now.getTimezoneOffset() * 60000;
      this.horaInicioTurno = new Date(now.getTime() - offsetMs).toISOString().slice(0, -1);
      localStorage.setItem('horaInicioTurno', this.horaInicioTurno);
    }

    this.cargarDatosDashboard();
  }

  ngOnDestroy(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
  }

  private obtenerMensajeError(err: any): string {
    if (!err) return 'Error desconocido.';
    if (typeof err === 'string') return err;
    if (err.error) {
      const errorBody = err.error;
      if (typeof errorBody === 'string') return errorBody;
      if (Array.isArray(errorBody)) return errorBody[0];
      if (typeof errorBody === 'object') {
        if (errorBody.detail) return errorBody.detail;
        if (errorBody.mensaje) return errorBody.mensaje;
        if (errorBody.message) return errorBody.message;
        if (errorBody.non_field_errors && errorBody.non_field_errors.length > 0) {
          return errorBody.non_field_errors[0];
        }
        const keys = Object.keys(errorBody);
        if (keys.length > 0) {
          const firstVal = errorBody[keys[0]];
          if (Array.isArray(firstVal) && firstVal.length > 0) return firstVal[0];
          if (typeof firstVal === 'string') return firstVal;
        }
      }
    }
    return err.message || 'Error del servidor.';
  }

  requierePlaca(tipo: string): boolean {
    if (!tipo) return false;
    const t = tipo.toUpperCase();
    return !['BICICLETA', 'PATIN', 'ELECTRICO'].includes(t);
  }

  getTipoVehiculo(ingreso: RegistroIngreso): string {
    return (ingreso?.tipo_vehiculo || ingreso?.vehiculo || ingreso?.tipo || 'AUTO').toString().toUpperCase();
  }

  getIconoVehiculo(ingreso: RegistroIngreso): string {
    const v = this.getTipoVehiculo(ingreso);
    if (['CARRO', 'AUTO', 'AUTOMOVIL'].includes(v)) return 'ti-car';
    if (['MOTO', 'MOTOCICLETA'].includes(v)) return 'ti-motorbike';
    if (['BICICLETA', 'PATIN', 'ELECTRICO'].includes(v)) return 'ti-bike';
    return 'ti-car';
  }

  esSinPlaca(ingreso: RegistroIngreso): boolean {
    const placa = (ingreso?.placa || ingreso?.placa_vehiculo || '').toString().toUpperCase();
    return ['S_PLACA', 'SIN PLACA', ''].includes(placa);
  }

  getPlacaTexto(ingreso: RegistroIngreso): string {
    return this.esSinPlaca(ingreso) ? 'SIN PLACA' : (ingreso?.placa || ingreso?.placa_vehiculo || ingreso?.vehiculo_placa || 'SIN PLACA');
  }

  getClaseAcreditacion(ingreso: RegistroIngreso): string {
    const rol = (ingreso?.rol_acceso || ingreso?.rol || ingreso?.acreditacion || '').toString().toUpperCase();
    if (['APRENDIZ', 'INSTRUCTOR', 'ADMINISTRATIVO', 'SEGURIDAD'].includes(rol)) return 'residente-tag';
    if (rol === 'VISITANTE') return 'visitante-tag';
    return 'apertura-tag';
  }

  getClaseMovimiento(ingreso: RegistroIngreso): string {
    const mov = (ingreso?.tipo_movimiento || ingreso?.movimiento || '').toString().toUpperCase();
    return (mov.includes('ENTRADA') || mov.includes('APERTURA')) ? 'entrada' : 'salida';
  }

  getFechaIngreso(ingreso: RegistroIngreso): any {
    return ingreso?.fecha_hora || ingreso?.timestamp || ingreso?.hora_fecha || ingreso?.fecha || ingreso?.created_at;
  }

  public cargarDatosDashboard(): void {
    this.vigilanteService.getAccesosHoy().subscribe({
      next: (data: any) => {
        if (data) {
          const listaBackend = data.recientes || data.accesos || data.registros || (Array.isArray(data) ? data : []);

          this.ultimosIngresos = (Array.isArray(listaBackend) ? listaBackend : []).map(registro => {
            const tipoVehiculo = registro.vehiculo || registro.tipo_vehiculo || 'AUTO';
            const conductor = registro.conductor || registro.nombre_conductor || 'VISITANTE';
            const acreditacion = registro.acreditacion || registro.rol_acceso || 'VISITANTE';
            const placa = registro.placa || registro.placa_vehiculo || 'SIN PLACA';
            const fechaHora = registro.fecha_hora || registro.hora_fecha || 'N/A';
            const movimiento = registro.movimiento || registro.tipo_movimiento || 'ENTRADA';

            return {
              ...registro,
              vehiculo: tipoVehiculo.toString().toUpperCase(),
              placa: placa.toString().toUpperCase(),
              conductor: conductor.toString().toUpperCase(),
              acreditacion: acreditacion.toString().toUpperCase(),
              fecha_hora: fechaHora,
              tipo_movimiento: movimiento.toString().toUpperCase(),
              movimiento: movimiento.toString().toUpperCase()
            };
          });

          this.ingresosHoy = data.ingresos_hoy ?? 0;
          this.salidasHoy = data.salidas_hoy ?? 0;
          this.vehiculosDentro = data.vehiculos_dentro ?? Math.max(0, this.ingresosHoy - this.salidasHoy);
          this.pendientesManual = data.aperturas_manuales ?? 0;
          this.denegadosHoy = data.accesos_denegados ?? 0;
        } else {
          this.ultimosIngresos = [];
        }

        this.cdRef.detectChanges();
      },
      error: (err) => console.error('Error cargando datos del backend:', err)
    });
  }

  private programarReseteoEstado(ms: number = 6000): void {
    if (this.resetTimer) clearTimeout(this.resetTimer);
    this.resetTimer = setTimeout(() => {
      this.estadoAcceso = 'idle';
      this.ultimoResultado = null;
      this.cdRef.detectChanges();
    }, ms);
  }

  abrirModalManual(): void {
    this.aperturaManual = { conductor: '', motivo: '', tipoVehiculo: 'AUTO', placa: '' };
    this.mostrarModalManual = true;
  }

  abrirModalVisitante(): void {
    this.visitante = { nombre: '', tipoVehiculo: 'AUTO', placa: '' };
    this.mostrarModalVisitante = true;
  }

  abrirModalInforme(): void {
    this.novedadesTexto = '';
    this.sinNovedadCheck = true;
    this.mostrarModalInforme = true;
  }

  cerrarModales(): void {
    this.mostrarModalManual = false;
    this.mostrarModalVisitante = false;
    this.mostrarModalInforme = false;
    this.mostrarModalSeleccionCuentas = false;
    this.coincidenciasPorteria = [];
    this.cuentasCoincidentes = [];
    this.cdRef.detectChanges();
  }

  cerrarModalCuentas(): void {
    this.mostrarModalSeleccionCuentas = false;
    this.coincidenciasPorteria = [];
    this.cuentasCoincidentes = [];
    this.vectorBiometricoPendiente = [];
    this.vectorBiometricoCapturado = null;
    this.cdRef.detectChanges();
  }

  confirmarAperturaManual(): void {
    if (this.guardandoManual) return;

    if (!this.aperturaManual.conductor.trim()) {
      alert('Por favor, ingresa el nombre del conductor.');
      return;
    }

    if (!this.aperturaManual.motivo.trim()) {
      alert('Por favor, ingresa el motivo de la apertura manual.');
      return;
    }

    const tipo = this.aperturaManual.tipoVehiculo;
    const sinPlaca = !this.requierePlaca(tipo);
    let placaValidacion = '';

    if (sinPlaca) {
      placaValidacion = 'S_PLACA';
    } else {
      if (!this.aperturaManual.placa?.trim()) {
        alert('Por favor, ingresa la placa del vehículo.');
        return;
      }

      placaValidacion = this.aperturaManual.placa.trim().toUpperCase();
      if (tipo === 'MOTO' && !/^[A-Z]{3}-?\d{2}[A-Z]$/.test(placaValidacion)) {
        alert('Error: Formato de placa de MOTO inválido (ej. ABC12D o ABC-12D).');
        return;
      } else if (tipo === 'AUTO' && !/^[A-Z]{3}-?\d{3}$/.test(placaValidacion)) {
        alert('Error: Formato de placa de AUTO inválido (ej. ABC123 o ABC-123).');
        return;
      }
    }

    this.guardandoManual = true;
    const placaFinalDB = placaValidacion.replace(/[- ]/g, '');

    const payloadManual = {
      tipo_movimiento: 'APERTURA_MANUAL',
      placa_vehiculo_input: placaFinalDB,
      tipo_vehiculo_input: tipo.toUpperCase(),
      nombre_conductor_input: this.aperturaManual.conductor.trim().toUpperCase(),
      motivo_input: `Apertura Manual - ${this.aperturaManual.motivo.trim()}`
    };

    this.vigilanteService.registrarAccesoManual(payloadManual).subscribe({
      next: () => {
        this.guardandoManual = false;
        this.estadoAcceso = 'ok';
        this.ultimoResultado = {
          placa: placaValidacion,
          conductor: this.aperturaManual.conductor.toUpperCase(),
          motivo: this.aperturaManual.motivo.toUpperCase()
        };
        this.cerrarModales();
        this.aperturaManual = { conductor: '', motivo: '', tipoVehiculo: 'AUTO', placa: '' };
        this.cargarDatosDashboard();
        this.programarReseteoEstado();
      },
      error: (err) => {
        this.guardandoManual = false;
        console.error('Error en apertura manual:', err);
        const mensajeError = this.obtenerMensajeError(err);
        alert(`No se pudo realizar la apertura manual: ${mensajeError}`);
        this.cerrarModales();
        this.cdRef.detectChanges();
      }
    });
  }

  confirmarVisitante(): void {
    if (this.guardandoVisitante) return;

    if (!this.visitante.nombre.trim()) {
      alert('Por favor, ingresa el nombre del visitante.');
      return;
    }

    const tipo = this.visitante.tipoVehiculo;
    const sinPlaca = !this.requierePlaca(tipo);
    let placaValidacion = '';

    if (sinPlaca) {
      placaValidacion = 'S_PLACA';
    } else {
      if (!this.visitante.placa?.trim()) {
        alert('Por favor, ingresa la placa del vehículo.');
        return;
      }

      placaValidacion = this.visitante.placa.trim().toUpperCase();
      if (tipo === 'MOTO' && !/^[A-Z]{3}-?\d{2}[A-Z]$/.test(placaValidacion)) {
        alert('Formato de placa de MOTO inválido (ej. JJF12D o JJF-12D).');
        return;
      } else if (tipo === 'AUTO' && !/^[A-Z]{3}-?\d{3}$/.test(placaValidacion)) {
        alert('Formato de placa de AUTO inválido (ej. ABC123 o ABC-123).');
        return;
      }
    }

    this.guardandoVisitante = true;
    const placaFinalDB = placaValidacion.replace(/[- ]/g, '');
    const tipoVehiculoBD = tipo.toUpperCase();

    const payloadVisitante = {
      tipo_movimiento: 'REGISTRO_VISITANTE',
      placa_vehiculo_input: placaFinalDB,
      tipo_vehiculo_input: tipoVehiculoBD,
      nombre_conductor_input: this.visitante.nombre.trim().toUpperCase(),
      motivo_input: `Visitante: ${this.visitante.nombre.trim()}`
    };

    this.vigilanteService.registrarAccesoManual(payloadVisitante).subscribe({
      next: () => {
        this.guardandoVisitante = false;
        this.estadoAcceso = 'ok';
        this.ultimoResultado = {
          placa: placaValidacion,
          conductor: `${this.visitante.nombre.toUpperCase()} (VISITANTE)`
        };
        this.mostrarModalVisitante = false;
        this.visitante = { nombre: '', tipoVehiculo: 'AUTO', placa: '' };
        this.cargarDatosDashboard();
        this.programarReseteoEstado();
      },
      error: (err) => {
        this.guardandoVisitante = false;
        console.error('Error al registrar visitante:', err);
        const mensajeError = this.obtenerMensajeError(err);
        alert(`No se pudo registrar el visitante: ${mensajeError}`);
        this.mostrarModalVisitante = false;
        this.cdRef.detectChanges();
      }
    });
  }

  confirmarCierreTurno(): void {
    this.vigilanteService.enviarInformeTurno(
      this.horaInicioTurno,
      this.novedadesTexto,
      this.sinNovedadCheck
    ).subscribe({
      next: (res) => {
        alert(`¡Informe de turno generado con éxito!\nEntradas: ${res.total_entradas}\nRemanentes: ${res.vehiculos_quedados}`);
        this.mostrarModalInforme = false;
        this.cerrarSesion();
      },
      error: (err) => {
        console.error(err);
        alert('Error al procesar el informe en el servidor.');
      }
    });
  }

  iniciarEscaneoPorteria(): void {
    this.estadoAcceso = 'idle';
    this.ultimoResultado = null;
    this.modoEscaneoBiometrico = true;
  }

  cancelarEscaneoPorteria(): void {
    this.modoEscaneoBiometrico = false;
    this.evaluandoBiometria = false;
  }

  // --- ESCANEO BIOMÉTRICO Y PORTERÍA ---

  onRostroCapturadoPorteria(vector: any): void {
    this.onRostroEscaneado(vector);
  }

  onRostroEscaneado(vector: any): void {
    this.modoEscaneoBiometrico = false;
    this.evaluandoBiometria = true;
    this.cdRef.detectChanges();

    const vectorFinal = Array.isArray(vector) ? vector : (vector?.vector || []);
    this.vectorBiometricoPendiente = vectorFinal;
    this.vectorBiometricoCapturado = vectorFinal;

    const placaLimpia = (this.placaInput || this.placaEscaneoInput || '').trim().replace(/[- ]/g, '').toUpperCase();
    const movimientoLimpio = this.tipoMovimientoSeleccionado || this.tipoMovimientoCamara || 'ENTRADA';

    const payload = {
      placa: placaLimpia,
      vector_biometrico: vectorFinal,
      tipo_movimiento: movimientoLimpio
    };

    this.vigilanteService.validarAccesoPorteria(payload).subscribe({
      next: (res: any) => {
        this.evaluandoBiometria = false;
        if (res.multiple_matches || (res.cuentas && res.cuentas.length > 1)) {
          this.cuentasCoincidentes = res.cuentas || [];
          this.coincidenciasPorteria = res.cuentas || [];
          this.mostrarModalSeleccionCuentas = true;
          this.cdRef.detectChanges();
          return;
        }
        this.vectorBiometricoPendiente = [];
        this.procesarAccesoExitoso(res.vehiculo, res.usuario?.nombre || res.usuario);
      },
      error: (err: any) => {
        this.evaluandoBiometria = false;
        const listaCuentas = err.error?.cuentas || err.error?.coincidencias;
        if ((err.status === 300 || err.error?.multiple_matches) && listaCuentas) {
          this.cuentasCoincidentes = listaCuentas;
          this.coincidenciasPorteria = listaCuentas;
          this.mostrarModalSeleccionCuentas = true;
          this.cdRef.detectChanges();
          return;
        }
        this.vectorBiometricoPendiente = [];
        this.procesarAccesoDenegado(err);
      }
    });
  }

  confirmarSeleccionPorteria(cuentaSeleccionada: any): void {
    this.seleccionarUsuarioBiometrico(cuentaSeleccionada);
  }

  seleccionarUsuarioBiometrico(cuentaSeleccionada: any): void {
  this.mostrarModalSeleccionCuentas = false;
  this.evaluandoBiometria = true;

  const placaLimpia = (this.placaInput || this.placaEscaneoInput || '').trim().replace(/[- ]/g, '').toUpperCase();

  const movimientoElegido = (this.tipoMovimientoSeleccionado || this.tipoMovimientoCamara || 'ENTRADA').toUpperCase();

  const payloadConfirmado = {
    placa: cuentaSeleccionada.placa && cuentaSeleccionada.placa !== 'S_PLACA' ? cuentaSeleccionada.placa : placaLimpia,
    id_usuario: cuentaSeleccionada.id_usuario,
    vector_biometrico: this.vectorBiometricoCapturado || this.vectorBiometricoPendiente,
    tipo_movimiento: movimientoElegido
  };

  this.vigilanteService.validarAccesoPorteria(payloadConfirmado).subscribe({
    next: (res: any) => {
      this.evaluandoBiometria = false;
      this.vectorBiometricoPendiente = [];
      this.vectorBiometricoCapturado = null;
      this.coincidenciasPorteria = [];
      this.cuentasCoincidentes = [];
      this.procesarAccesoExitoso(res.vehiculo, cuentaSeleccionada.nombre || res.usuario?.nombre);
    },
    error: (err: any) => {
      this.evaluandoBiometria = false;
      this.vectorBiometricoPendiente = [];
      this.vectorBiometricoCapturado = null;
      this.coincidenciasPorteria = [];
      this.cuentasCoincidentes = [];
      this.procesarAccesoDenegado(err);
    }
  });
}

  procesarAccesoExitoso(vehiculo: string, conductorNombre: string): void {
    this.estadoAcceso = 'ok';
    const placaMostrar = (this.placaInput || this.placaEscaneoInput).trim();
    this.ultimoResultado = {
      placa: vehiculo || (placaMostrar ? placaMostrar.toUpperCase() : 'S_PLACA'),
      conductor: conductorNombre ? conductorNombre.toUpperCase() : 'USUARIO AUTORIZADO'
    };
    this.placaEscaneoInput = '';
    this.placaInput = '';
    this.cargarDatosDashboard();
    this.programarReseteoEstado();
  }

  procesarAccesoDenegado(err: any): void {
    this.estadoAcceso = 'deny';
    let mensajeError = 'ACCESO DENEGADO / NO AUTORIZADO';
    if (err?.error) {
      if (typeof err.error === 'string') mensajeError = err.error;
      else if (err.error.mensaje) mensajeError = err.error.mensaje;
      else if (err.error.detail) mensajeError = err.error.detail;
    }

    const placaMostrar = (this.placaInput || this.placaEscaneoInput).trim();
    this.ultimoResultado = {
      placa: placaMostrar ? placaMostrar.toUpperCase() : 'S_PLACA',
      conductor: mensajeError.toUpperCase()
    };
    this.cargarDatosDashboard();
    this.programarReseteoEstado();
  }

  cerrarSesion(): void {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('usuario');
    localStorage.removeItem('horaInicioTurno');
    this.router.navigate(['/login']);
  }
}