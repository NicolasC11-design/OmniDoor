import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExportService } from '../../servicios/export/export.service';

export interface RegistroHistorial {
  fechaRaw?: Date;
  fechaHora: string;
  usuario: string;
  tipoVehiculo: string;
  placa: string;
  metodoValidacion: string;
  evento: string;
  sincronizado: boolean;
}

@Component({
  selector: 'app-historial-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial-reportes.html',
  styleUrls: ['./historial-reportes.css'],
  encapsulation: ViewEncapsulation.None
})
export class HistorialReportesComponent {
  @Input() historial: RegistroHistorial[] = [];
  @Input() cargando = false;

  filtros = {
    desde: '',
    hasta: '',
    tipoVehiculo: 'todos',
    tipoMovimiento: 'todos',
  };

  constructor(private exportService: ExportService) {}

  get historialFiltrado(): RegistroHistorial[] {
  if (!this.historial || this.historial.length === 0) return [];

  return this.historial.filter(reg => {
    if (this.filtros.desde && reg.fechaRaw) {
      const fechaDesde = new Date(`${this.filtros.desde}T00:00:00`);
      if (reg.fechaRaw < fechaDesde) return false;
    }

    if (this.filtros.hasta && reg.fechaRaw) {
      const fechaHasta = new Date(`${this.filtros.hasta}T23:59:59`);
      if (reg.fechaRaw > fechaHasta) return false;
    }

    if (this.filtros.tipoVehiculo && this.filtros.tipoVehiculo !== 'todos') {
      const tipoReg = (reg.tipoVehiculo || '').toLowerCase();
      const tipoFiltro = this.filtros.tipoVehiculo.toLowerCase();
      if (!tipoReg.includes(tipoFiltro)) return false;
    }

    if (this.filtros.tipoMovimiento && this.filtros.tipoMovimiento !== 'todos') {
      const evReg = (reg.evento || '').toLowerCase().replace(/[\s_]/g, '');
      const evFiltro = this.filtros.tipoMovimiento.toLowerCase().replace(/[\s_]/g, '');
      if (!evReg.includes(evFiltro)) return false;
    }

    return true;
  });
}

  onFechaDesdeChange(): void {
    if (this.filtros.desde && this.filtros.hasta && this.filtros.hasta < this.filtros.desde) {
      this.filtros.hasta = this.filtros.desde;
    }
  }

  onFechaHastaChange(): void {
    if (this.filtros.desde && this.filtros.hasta && this.filtros.hasta < this.filtros.desde) {
      this.filtros.desde = this.filtros.hasta;
    }
  }

  limpiarFiltros(): void {
    this.filtros = {
      desde: '',
      hasta: '',
      tipoVehiculo: 'todos',
      tipoMovimiento: 'todos',
    };
  }

  exportar(formato: 'pdf' | 'excel'): void {
    if (this.historialFiltrado.length === 0) {
      alert('No hay registros filtrados para exportar.');
      return;
    }

    if (formato === 'excel') {
      this.exportService.exportarExcel(this.historialFiltrado);
    } else {
      this.exportService.exportarPDF(this.historialFiltrado);
    }
  }
}