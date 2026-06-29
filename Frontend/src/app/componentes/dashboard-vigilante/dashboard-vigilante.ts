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
    this.ingresosHoy = this.ultimosIngresos.filter(i => i.tipo_movimiento === 'ENTRADA' || i.movimiento === 'ENTRADA').length;
    this.salidasHoy = this.ultimosIngresos.filter(i => i.tipo_movimiento === 'SALIDA' || i.movimiento === 'SALIDA').length;
    this.pendientesManual = this.ultimosIngresos.filter(i => i.placa_vehiculo === 'APERTURA_M' || i.nombre_conductor === 'Apertura Manual Forzada' || i.tipo_movimiento === 'APERTURA_MANUAL').length;
    this.vehiculosDentro = this.ingresosHoy - this.salidasHoy;
    this.denegadosHoy = 0; 
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
      alert('Por favor, ingresa el motivo de la apertura manual.');
      return;
    }

    const tipo = this.aperturaManual.tipoVehiculo;
    const noRequierePlaca = tipo === 'bicicleta' || tipo === 'patin' || tipo === 'electrico';
    
    let placaFinal = '';

    if (noRequierePlaca) {
      placaFinal = 'S_PLACA'; 
    } else {
      if (!this.aperturaManual.placa || !this.aperturaManual.placa.trim()) {
        alert('Por favor, ingresa la placa del vehículo para autorizar la apertura.');
        return;
      }
      
      placaFinal = this.aperturaManual.placa.trim().toUpperCase();
      if (tipo === 'moto') {
        const regexMoto = /^[A-Z]{3}-\d{2}[A-Z]$/;
        if (!regexMoto.test(placaFinal)) {
          alert('Error de Seguridad: El formato de placa no corresponde a una Motocicleta. Debe terminar en letra (ej. ABC-12D).');
          return;
        }
      } else if (tipo === 'carro') {
        const regexCarro = /^[A-Z]{3}-\d{3}$/;
        if (!regexCarro.test(placaFinal)) {
          alert('Error de Seguridad: El formato de placa no corresponde a un Automóvil. Debe terminar en 3 números (ej. ABC-123).');
          return;
        }
      }
    }

    const payloadManual = { 
      tipo_movimiento: 'APERTURA_MANUAL',
      vehiculo: null,
      placa_vehiculo_input: placaFinal,
      tipo_vehiculo_input: tipo.toUpperCase(),
      nombre_conductor_input: this.aperturaManual.motivo.trim(),
      motivo_input: `Apertura Manual: ${this.aperturaManual.motivo}`
    };

    this.vigilanteService.registrarAccesoManual(payloadManual).subscribe({
      next: (res: any) => {
        this.estadoAcceso = 'ok';
        this.ultimoResultado = { 
          placa: placaFinal, 
          conductor: this.aperturaManual.motivo
        };
        this.cerrarModales();
        this.aperturaManual = { motivo: '', tipoVehiculo: 'carro', placa: '' };
        this.cargarDatosDashboard();
      },
      error: (err) => {
        console.error('Error al registrar apertura manual:', err);
        alert('No se pudo registrar la apertura en el servidor.');
      }
    });
  }

  confirmarVisitante(): void {
    if (!this.visitante.nombre.trim()) {
      alert('Por favor, ingresa el nombre del visitante.');
      return;
    }

    const tipo = this.visitante.tipoVehiculo;
    let placaFinal = '';
    const noRequierePlaca = tipo === 'bicicleta' || tipo === 'patin' || tipo === 'electrico';

    if (noRequierePlaca) {
      placaFinal = 'S_PLACA'; 
    } else {
      if (!this.visitante.placa || !this.visitante.placa.trim()) {
        alert('Por favor, ingresa la placa del vehículo.');
        return;
      }
      
      placaFinal = this.visitante.placa.trim().toUpperCase();
      if (tipo === 'moto') {
        const regexMoto = /^[A-Z]{3}-\d{2}[A-Z]$/;
        if (!regexMoto.test(placaFinal)) {
          alert('Formato de placa de motocicleta inválido. Debe terminar en letra (ej. ABC-12D).');
          return;
        }
      } else if (tipo === 'carro') {
        const regexCarro = /^[A-Z]{3}-\d{3}$/;
        if (!regexCarro.test(placaFinal)) {
          alert('Formato de placa de carro inválido. Debe contener 3 números (ej. ABC-123).');
          return;
        }
      }
    }
    
    const payloadVisitante = { 
      tipo_movimiento: 'REGISTRO_VISITANTE',
      vehiculo: null,
      placa_vehiculo_input: placaFinal, 
      tipo_vehiculo_input: tipo.toUpperCase(), 
      nombre_conductor_input: this.visitante.nombre,
      motivo_input: `Visitante: ${this.visitante.nombre}`
    };

    this.vigilanteService.registrarAccesoManual(payloadVisitante).subscribe({
      next: (res: any) => {
        this.estadoAcceso = 'ok';
        this.ultimoResultado = { 
          placa: placaFinal, 
          conductor: this.visitante.nombre 
        };
        this.cerrarModales();
        this.visitante = { nombre: '', tipoVehiculo: 'carro', placa: '' };
        this.cargarDatosDashboard();
      },
      error: (err) => {
        console.error('Error al registrar visitante:', err);
        alert('No se pudo registrar el visitante en el servidor.');
      }
    });
  }

  cerrarSesion(): void {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('usuario');
    this.router.navigate(['/login']);
  }
}