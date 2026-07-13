import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VigilanteService } from '../../servicios/vigilante'; 

export interface IngresoRegistro {
  medio: string;
  icono: string;
  placa: string;
  conductor: string;
  hora: string;
  autorizado: boolean;
}

@Component({
  selector: 'app-dashboard-vigilante',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-vigilante.html',
  styleUrl: './dashboard-vigilante.css',
})
export class DashboardVigilante implements OnInit {
  online = true;
  ingresosHoy = 0;
  salidasHoy = 0;
  vehiculosDentro = 0;
  pendientesManual = 0; 
  denegadosHoy = 0; 
  estadoAcceso: 'idle' | 'ok' | 'deny' = 'idle';
  ultimoResultado: { placa: string; conductor: string } | null = null;
  ultimosIngresos: any[] = [];
  mostrarModalManual = false;
  mostrarModalVisitante = false;

  aperturaManual = {
    motivo: '',
    tipoVehiculo: 'carro',
    placa: ''
  };

  visitante = { nombre: '', tipoVehiculo: 'carro', placa: '' };

  mostrarModalInforme = false;
  novedadesTexto: string = '';
  sinNovedadCheck: boolean = true;
  horaInicioTurno!: string;

  constructor(
    private router: Router, 
    private vigilanteService: VigilanteService, 
    private cdRef: ChangeDetectorRef
  ){}

  ngOnInit(): void {
    this.horaInicioTurno = new Date().toISOString();
    setTimeout(() => {
      this.cargarDatosDashboard();
    }, 300);
  }

  private cargarDatosDashboard(): void {
    this.vigilanteService.getAccesosHoy().subscribe({
      next: (data: any) => {
        this.ultimosIngresos = data || [];
        this.calcularMetricasBackend();
        this.cdRef.detectChanges(); 
      },
      error: (err) => console.error('Error cargando datos del backend:', err)
    });
  }

  private calcularMetricasBackend(): void {

    this.ingresosHoy = this.ultimosIngresos.filter(i => 
      i.tipo_movimiento === 'ENTRADA' || i.movimiento === 'ENTRADA'
    ).length;
    this.salidasHoy = this.ultimosIngresos.filter(i => 
      i.tipo_movimiento === 'SALIDA' || i.movimiento === 'SALIDA'
    ).length;
    this.pendientesManual = this.ultimosIngresos.filter(i => 
      (i.tipo_movimiento === 'APERTURA_MANUAL' || i.movimiento === 'APERTURA_MANUAL') &&
      !(i.nombre_conductor?.includes('RECHAZADO') || i.rol_acceso === 'DENEGADO')
    ).length;
    this.vehiculosDentro = this.ingresosHoy - this.salidasHoy;
    this.denegadosHoy = this.ultimosIngresos.filter(i => 
      i.rol_acceso === 'DENEGADO' || 
      i.nombre_conductor?.includes('RECHAZADO') || 
      i.nombre_conductor?.includes('ACCESO RECHAZADO')
    ).length;
  }

  abrirModalManual(): void {
    this.aperturaManual = { motivo: '', tipoVehiculo: 'carro', placa: '' };
    this.mostrarModalManual = true;
  }

  abrirModalVisitante(): void {
    this.visitante = { nombre: '', tipoVehiculo: 'carro', placa: '' };
    this.mostrarModalVisitante = true;
  }

  abrirModalInforme(): void {
    this.novedadesTexto = '';
    this.sinNovedadCheck = true;
    this.mostrarModalInforme = true;
  }

  confirmarCierreTurno(): void {
    this.vigilanteService.enviarInformeTurno(
      this.horaInicioTurno,
      this.novedadesTexto,
      this.sinNovedadCheck
    ).subscribe({
      next: (res) => {
        alert(`¡Informe de turno generado con éxito!\nEntradas procesadas: ${res.total_entradas}\nVehículos remanentes: ${res.vehiculos_quedados}`);
        this.mostrarModalInforme = false;
        this.cerrarSesion();
      },
      error: (err) => {
        console.error(err);
        alert('Error al procesar y guardar el informe en el servidor.');
      }
    });
  }

  cerrarModales(): void {
    this.mostrarModalManual = false;
    this.mostrarModalVisitante = false;
    this.mostrarModalInforme = false;

    this.cdRef.detectChanges();
  }

  confirmarAperturaManual(): void {
  if (!this.aperturaManual.motivo.trim()) {
    alert('Por favor, ingresa el nombre del conductor o motivo en el campo correspondiente.');
    return;
  }

  const tipo = this.aperturaManual.tipoVehiculo;
  const noRequierePlaca = tipo === 'bicicleta' || tipo === 'patin' || tipo === 'electrico';
  
  let placaValidacion = '';

  if (noRequierePlaca) {
    placaValidacion = 'S_PLACA'; 
  } else {
    if (!this.aperturaManual.placa || !this.aperturaManual.placa.trim()) {
      alert('Por favor, ingresa la placa del vehículo para autorizar la apertura.');
      return;
    }
    
    placaValidacion = this.aperturaManual.placa.trim().toUpperCase();
    if (tipo === 'moto') {
      const regexMoto = /^[A-Z]{3}-\d{2}[A-Z]$/;
      if (!regexMoto.test(placaValidacion)) {
        alert('Error de Seguridad: El formato de placa no corresponde a una Motocicleta. Debe incluir guion y terminar en letra (ej. ABC-12D).');
        return;
      }
    } else if (tipo === 'carro') {
      const regexCarro = /^[A-Z]{3}-\d{3}$/;
      if (!regexCarro.test(placaValidacion)) {
        alert('Error de Seguridad: El formato de placa no corresponde a un Automóvil. Debe incluir guion y terminar en 3 números (ej. ABC-123).');
        return;
      }
    }
  }

  const placaFinalDB = placaValidacion.replace('-', '');

  const payloadManual = { 
    tipo_movimiento: 'APERTURA_MANUAL',
    vehiculo: null,
    placa_vehiculo_input: placaFinalDB,
    tipo_vehiculo_input: tipo.toUpperCase(),
    nombre_conductor_input: this.aperturaManual.motivo.trim(),
    motivo_input: `Apertura Manual: ${this.aperturaManual.motivo}`
  };

  this.vigilanteService.registrarAccesoManual(payloadManual).subscribe({
    next: (res: any) => {
      this.estadoAcceso = 'ok';
      this.ultimoResultado = { 
        placa: placaValidacion, 
        conductor: this.aperturaManual.motivo.toUpperCase()
      };

      this.cerrarModales();
      this.aperturaManual = { motivo: '', tipoVehiculo: 'carro', placa: '' };
      this.cargarDatosDashboard();
      this.cdRef.detectChanges();

      setTimeout(() => {
        this.estadoAcceso = 'idle';
        this.ultimoResultado = null;
        this.cdRef.detectChanges();
      }, 6000);
    },
    error: (err) => {
      console.error('Error al registrar apertura manual:', err);
      this.cerrarModales();

      if (err.status === 400) {
        let mensajeError = 'La placa ingresada no se encuentra registrada en el sistema.';
        if (err.error) {
          if (typeof err.error === 'string') mensajeError = err.error;
          else if (Array.isArray(err.error)) mensajeError = err.error[0];
          else if (err.error.non_field_errors) mensajeError = err.error.non_field_errors[0];
          else if (typeof err.error === 'object') {
            const llaves = Object.keys(err.error);
            mensajeError = err.error[llaves[0]];
          }
        }

        const forzar = confirm(`ALERTA: ${mensajeError}\n\n¿Desea FORZAR LA APERTURA de emergencia bajo su responsabilidad?`);
        if (forzar) {
          this.procederConAperturaDeContingencia(placaValidacion, 'ok', ' (FORZADO CON ÉXITO)', payloadManual);
        } else {
          this.procederConAperturaDeContingencia(placaValidacion, 'deny', ' (ACCESO RECHAZADO/CANCELADO)', payloadManual, mensajeError);
        }

      } else {
        const forzarOffline = confirm('FALLA DE RED: Servidor fuera de línea.\n\n¿Desea proceder con la APERTURA FÍSICA LOCAL de emergencia?');
        if (forzarOffline) {
          this.procederConAperturaDeContingencia(placaValidacion, 'ok', ' (FORZADO - OFFLINE)', payloadManual);
        } else {
          this.procederConAperturaDeContingencia(placaValidacion, 'deny', ' (RECHAZADO - OFFLINE)', payloadManual, 'Servidor Offline');
        }
      }
      this.cdRef.detectChanges();
    }
  });
}

private procederConAperturaDeContingencia(
    placa: string, 
    estadoDestino: 'ok' | 'deny', 
    sufijoTexto: string, 
    payloadOriginal: any,
    motivoRechazo?: string
  ): void {
    this.estadoAcceso = estadoDestino;
    
    this.ultimoResultado = { 
      placa: placa, 
      conductor: this.aperturaManual.motivo.toUpperCase() + sufijoTexto
    };

    if (estadoDestino === 'deny') {
      const payloadDenegado = {
        ...payloadOriginal,
        motivo_input: `RECHAZADO MANUALMENTE - ${motivoRechazo || 'No autorizado'}`
      };
      
      this.vigilanteService.registrarAccesoManual(payloadDenegado).subscribe({
        next: () => {
          console.log('Log de auditoría: Acceso denegado guardado.');
          this.cargarDatosDashboard();
        },
        error: (saveErr) => console.error('No se pudo guardar la denegación:', saveErr)
      });
    }

    this.aperturaManual = { motivo: '', tipoVehiculo: 'carro', placa: '' };
    this.cargarDatosDashboard();
    this.cdRef.detectChanges();

    setTimeout(() => {
      this.estadoAcceso = 'idle';
      this.ultimoResultado = null;
      this.cdRef.detectChanges();
    }, 6000);
  }


  confirmarVisitante(): void {
    if (!this.visitante.nombre.trim()) {
      alert('Por favor, ingresa el nombre del visitante.');
      return;
    }

    const tipo = this.visitante.tipoVehiculo;
    let placaValidacion = '';
    const noRequierePlaca = tipo === 'bicicleta' || tipo === 'patin' || tipo === 'electrico';

    if (noRequierePlaca) {
      placaValidacion = 'S_PLACA'; 
    } else {
      if (!this.visitante.placa || !this.visitante.placa.trim()) {
        alert('Por favor, ingresa la placa del vehículo.');
        return;
      }
      
      placaValidacion = this.visitante.placa.trim().toUpperCase();
      if (tipo === 'moto') {
        const regexMoto = /^[A-Z]{3}-\d{2}[A-Z]$/;
        if (!regexMoto.test(placaValidacion)) {
          alert('Formato de placa de motocicleta inválido. Debe incluir guion (ej. ABC-12D).');
          return;
        }
      } else if (tipo === 'carro') {
        const regexCarro = /^[A-Z]{3}-\d{3}$/;
        if (!regexCarro.test(placaValidacion)) {
          alert('Formato de placa de carro inválido. Debe incluir guion (ej. ABC-123).');
          return;
        }
      }
    }
    
    const placaFinalDB = placaValidacion.replace('-', '');

    const payloadVisitante = { 
      tipo_movimiento: 'REGISTRO_VISITANTE', 
      vehiculo: null,
      placa_vehiculo_input: placaFinalDB, 
      tipo_vehiculo_input: tipo.toUpperCase(), 
      nombre_conductor_input: this.visitante.nombre.trim().toUpperCase(),
      motivo_input: `Visitante: ${this.visitante.nombre.trim()}`
    };

    this.vigilanteService.registrarAccesoManual(payloadVisitante).subscribe({
      next: (res: any) => {

        this.estadoAcceso = 'ok';
        this.ultimoResultado = { 
          placa: placaValidacion, 
          conductor: this.visitante.nombre.toUpperCase() + ' (VISITANTE)'
        };
        
        this.finalizarFlujoVisitante();
      },
      error: (err) => {
        console.error('Error en validación de visitante:', err);
        this.estadoAcceso = 'deny';
        this.ultimoResultado = { 
          placa: placaValidacion, 
          conductor: 'ERROR: INCONSISTENCIA DE DATOS'
        };

        if (err.status === 400 && err.error) {
          if (typeof err.error === 'string') alert(err.error);
          else if (err.error.non_field_errors) alert(err.error.non_field_errors[0]);
        } else {
          alert('No se pudo registrar el visitante debido a un problema de red o servidor offline.');
        }

        this.finalizarFlujoVisitante();
      }
    });
  }

  private finalizarFlujoVisitante(): void {
    this.cerrarModales();
    this.visitante = { nombre: '', tipoVehiculo: 'carro', placa: '' };
    this.cargarDatosDashboard();
    this.cdRef.detectChanges(); 

    setTimeout(() => {
      this.estadoAcceso = 'idle';
      this.ultimoResultado = null;
      this.cdRef.detectChanges(); 
    }, 6000);
  }

  cerrarSesion(): void {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('usuario');
    this.router.navigate(['/login']);
  }
}