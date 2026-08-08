import { Component, Input, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
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
    return this.historial.filter(reg => {
      if (this.filtros.desde) {
        const fechaDesde = new Date(`${this.filtros.desde}T00:00:00`);
        if (reg.fechaRaw && reg.fechaRaw < fechaDesde) return false;
      }

      if (this.filtros.hasta) {
        const fechaHasta = new Date(`${this.filtros.hasta}T23:59:59`);
        if (reg.fechaRaw && reg.fechaRaw > fechaHasta) return false;
      }

      if (this.filtros.tipoMovimiento && this.filtros.tipoMovimiento !== 'todos') {
        if (reg.evento.toLowerCase() !== this.filtros.tipoMovimiento.toLowerCase()) return false;
      }

      return true;
    });
  }

  exportar(formato: 'pdf' | 'excel'): void {
    if (formato === 'excel') {
      this.exportService.exportarExcel(this.historialFiltrado);
    } else {
      this.exportService.exportarPDF(this.historialFiltrado);
    }
  }
}