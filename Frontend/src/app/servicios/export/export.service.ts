import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RegistroHistorial } from '../../componentes/historial-reportes/historial-reportes';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  exportarExcel(datos: RegistroHistorial[]): void {
    const datosTabla = datos.map(item => ({
      'FECHA / HORA': item.fechaHora,
      'USUARIO / PERSONA': item.usuario,
      'VEHÍCULO': item.tipoVehiculo,
      'PLACA': item.placa,
      'MÉTODO VALIDACIÓN': item.metodoValidacion,
      'EVENTO': item.evento,
      'SINCRONIZADO': item.sincronizado ? 'SÍ' : 'NO'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosTabla);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial');

    const fechaHoy = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `OmniDoor_Historial_${fechaHoy}.xlsx`);
  }

  exportarPDF(datos: RegistroHistorial[]): void {
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text('OMNIDOOR - HISTORIAL LOGÍSTICO Y AUDITORÍA', 14, 15);

    const columnas = ['Fecha / Hora', 'Usuario', 'Vehículo', 'Placa', 'Método Validación', 'Evento', 'Sincronizado'];
    const filas = datos.map(item => [
      item.fechaHora,
      item.usuario,
      item.tipoVehiculo,
      item.placa,
      item.metodoValidacion,
      item.evento,
      item.sincronizado ? 'SÍ' : 'NO'
    ]);

    autoTable(doc, {
      startY: 22,
      head: [columnas],
      body: filas,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 8 }
    });

    const fechaHoy = new Date().toISOString().split('T')[0];
    doc.save(`OmniDoor_Historial_${fechaHoy}.pdf`);
  }
}