import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReporteAccesoItem {
  fechaHora: string;
  usuario: string;
  tipoVehiculo: string;
  placa: string;
  metodoValidacion: string;
  evento: string;
  sincronizado: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  exportarExcel(datos: ReporteAccesoItem[], nombreArchivo: string = 'OmniDoor_Historial'): void {
    if (!datos || datos.length === 0) {
      console.warn('ExportService: No hay datos disponibles para exportar a Excel.');
      return;
    }

    const datosTabla = datos.map(item => ({
      'FECHA / HORA': item.fechaHora || 'N/A',
      'USUARIO / PERSONA': item.usuario || 'N/A',
      'VEHÍCULO': (item.tipoVehiculo || 'N/A').toUpperCase(),
      'PLACA': (item.placa || 'N/A').toUpperCase(),
      'MÉTODO VALIDACIÓN': item.metodoValidacion || 'N/A',
      'EVENTO': item.evento || 'N/A',
      'SINCRONIZADO': item.sincronizado ? 'SÍ' : 'NO'
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(datosTabla);

    const colWidths = Object.keys(datosTabla[0]).map(key => ({
      wch: Math.max(key.length, 18)
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial Accesos');

    const fechaHoy = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${nombreArchivo}_${fechaHoy}.xlsx`);
  }

  exportarPDF(datos: ReporteAccesoItem[], titulo: string = 'OMNIDOOR - HISTORIAL LOGÍSTICO Y AUDITORÍA'): void {
    if (!datos || datos.length === 0) {
      console.warn('ExportService: No hay datos disponibles para exportar a PDF.');
      return;
    }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(titulo, 14, 15);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const fechaGeneracion = new Date().toLocaleString();
    doc.text(`Fecha de emisión: ${fechaGeneracion}`, 14, 21);

    const columnas = ['Fecha / Hora', 'Usuario', 'Vehículo', 'Placa', 'Método Validación', 'Evento', 'Sincronizado'];
    const filas = datos.map(item => [
      item.fechaHora || 'N/A',
      item.usuario || 'N/A',
      (item.tipoVehiculo || 'N/A').toUpperCase(),
      (item.placa || 'N/A').toUpperCase(),
      item.metodoValidacion || 'N/A',
      item.evento || 'N/A',
      item.sincronizado ? 'SÍ' : 'NO'
    ]);

    autoTable(doc, {
      startY: 25,
      head: [columnas],
      body: filas,
      theme: 'grid',
      headStyles: { 
        fillColor: [15, 23, 42], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold', 
        halign: 'center' 
      },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 50 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 40 },
        5: { cellWidth: 30 },
        6: { cellWidth: 25, halign: 'center' }
      },
      didDrawPage: (data) => {
        const str = `Página ${data.pageNumber}`;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(str, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
      }
    });

    const fechaHoy = new Date().toISOString().split('T')[0];
    doc.save(`OmniDoor_Historial_${fechaHoy}.pdf`);
  }
}