import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
export class DashboardVigilante implements OnInit, OnDestroy {
  online = true;


  ingresosHoy = 0;
  pendientesManual = 0;
  denegadosHoy = 0;
  estadoAcceso: 'idle' | 'ok' | 'deny' = 'idle';
  ultimoResultado: { placa: string; conductor: string } | null = null;

  ultimosIngresos: IngresoRegistro[] = [];


  mostrarModalManual = false;
  mostrarModalVisitante = false;
  motivoManual = '';
  visitante = { nombre: '', placa: '' };

  private simulacionInterval?: ReturnType<typeof setInterval>;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.cargarUltimosIngresos();

  }

  ngOnDestroy(): void {
    if (this.simulacionInterval) {
      clearInterval(this.simulacionInterval);
    }
  }

  private cargarUltimosIngresos(): void {

    this.ultimosIngresos = [];
    this.ingresosHoy = this.ultimosIngresos.filter(i => i.autorizado).length;
    this.denegadosHoy = this.ultimosIngresos.filter(i => !i.autorizado).length;
  }

  abrirModalManual(): void {
    this.motivoManual = '';
    this.mostrarModalManual = true;
  }

  abrirModalVisitante(): void {
    this.visitante = { nombre: '', placa: '' };
    this.mostrarModalVisitante = true;
  }

  cerrarModales(): void {
    this.mostrarModalManual = false;
    this.mostrarModalVisitante = false;
  }

  confirmarAperturaManual(): void {
    if (!this.motivoManual.trim()) {
      return;
    }

    this.pendientesManual++;
    this.estadoAcceso = 'ok';
    this.ultimoResultado = { placa: '—', conductor: 'apertura manual' };
    this.cerrarModales();
  }

  confirmarVisitante(): void {
    if (!this.visitante.nombre.trim() || !this.visitante.placa.trim()) {
      return;
    }
    this.ultimosIngresos.unshift({
      medio: 'visitante',
      icono: 'ti-car',
      placa: this.visitante.placa.toUpperCase(),
      conductor: this.visitante.nombre,
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      autorizado: true,
    });
    this.ingresosHoy++;
    this.estadoAcceso = 'ok';
    this.ultimoResultado = { placa: this.visitante.placa.toUpperCase(), conductor: this.visitante.nombre };
    this.cerrarModales();
  }

  cerrarSesion(): void {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('usuario');
    this.router.navigate(['/login']);
  }
}