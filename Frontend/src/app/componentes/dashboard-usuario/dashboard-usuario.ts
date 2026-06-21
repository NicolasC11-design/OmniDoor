import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../servicios/auth';

export interface MiVehiculo {
  tipoVehiculo: string;
  placa: string;
  biometriaCapturada: boolean;
}

export interface RegistroMioHistorial {
  fecha: string;
  hora: string;
  movimiento: string;
  autorizado: boolean;
}

@Component({
  selector: 'app-dashboard-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-usuario.html',
  styleUrl: './dashboard-usuario.css',
})
export class DashboardUsuario implements OnInit {
  usuario: any = {};
  vehiculo: MiVehiculo | null = null;
  miHistorial: RegistroMioHistorial[] = [];
  mensajeExito: string | null = null;
  mostrarModalVehiculo = false;
  mostrarModalDatos = false;
  mostrarModalPassword = false;

  formVehiculo: MiVehiculo = { tipoVehiculo: 'auto', placa: '', biometriaCapturada: false };
  formDatos = { nombre_completo: '', correo: '' };
  formPassword = { actual: '', nueva: '', confirmar: '' };

  private iconosVehiculo: Record<string, string> = {
    auto: 'ti-car',
    moto: 'ti-motorbike',
    bici: 'ti-bike',
    patin: 'ti-skateboard',
    electr: 'ti-plug',
  };

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarUsuario();
    this.cargarVehiculo();
    this.cargarHistorial();
  }

  private cargarUsuario(): void {
    const raw = localStorage.getItem('usuario');
    this.usuario = raw ? JSON.parse(raw) : {};
    this.formDatos = {
      nombre_completo: this.usuario.nombre_completo || '',
      correo: this.usuario.correo || '',
    };
  }

  private cargarVehiculo(): void {
    this.vehiculo = null;
  }

  private cargarHistorial(): void {
    this.miHistorial = [];
  }

  iniciales(): string {
    const nombre = this.usuario?.nombre_completo || '';
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }

  iconoVehiculo(): string {
    if (!this.vehiculo) return 'ti-car';
    return this.iconosVehiculo[this.vehiculo.tipoVehiculo] || 'ti-car';
  }

  abrirModalVehiculo(): void {
    this.formVehiculo = this.vehiculo
      ? { ...this.vehiculo }
      : { tipoVehiculo: 'auto', placa: '', biometriaCapturada: false };
    this.mostrarModalVehiculo = true;
  }

  guardarVehiculo(): void {
    if (!this.formVehiculo.placa.trim()) return;
    this.vehiculo = { ...this.formVehiculo, placa: this.formVehiculo.placa.toUpperCase() };
    this.mostrarExito('Vehículo guardado correctamente');
    this.cerrarModales();
  }


  abrirModalDatos(): void {
    this.mostrarModalDatos = true;
  }

  guardarDatos(): void {
    if (!this.formDatos.nombre_completo.trim() || !this.formDatos.correo.trim()) return;
    this.usuario = { ...this.usuario, ...this.formDatos };
    localStorage.setItem('usuario', JSON.stringify(this.usuario));
    this.mostrarExito('Datos actualizados correctamente');
    this.cerrarModales();
  }


  abrirModalPassword(): void {
    this.formPassword = { actual: '', nueva: '', confirmar: '' };
    this.mostrarModalPassword = true;
  }

  guardarPassword(): void {
    const { actual, nueva, confirmar } = this.formPassword;
    if (!actual || !nueva || nueva !== confirmar) return;
    this.mostrarExito('Contraseña actualizada correctamente');
    this.cerrarModales();
  }

  cerrarModales(): void {
    this.mostrarModalVehiculo = false;
    this.mostrarModalDatos = false;
    this.mostrarModalPassword = false;
  }

  private mostrarExito(msg: string): void {
    this.mensajeExito = msg;
    setTimeout(() => { this.mensajeExito = null; }, 3000);
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}