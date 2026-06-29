import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../servicios/auth';
import { UsuarioService } from '../../servicios/usuarios';

export interface MiVehiculo {
  id_vehiculo?: string;
  tipoVehiculo: string;
  placa: string;
  marca: string;
  modelo: string;
  biometriaCapturada?: boolean;
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
  vehiculos: MiVehiculo[] = [];
  miHistorial: RegistroMioHistorial[] = [];
  
  mensajeExito: string | null = null;
  mostrarModalVehiculo = false;
  mostrarModalDatos = false;
  mostrarModalPassword = false;
  cargando = false;

  formVehiculo: MiVehiculo = { tipoVehiculo: 'auto', placa: '', marca: '', modelo: '' };
  formDatos = { nombre_completo: '', correo: '', telefono: '', direccion: '' };
  formPassword = { actual: '', nueva: '', confirmar: '' };

  private iconosVehiculo: Record<string, string> = {
    auto: 'ti-car', moto: 'ti-motorbike', bici: 'ti-bike', patin: 'ti-skateboard', electr: 'ti-plug',
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.cargarUsuario();
    this.cargarVehiculos();
    this.cargarHistorial();
  }

  private cargarUsuario(): void {
    const raw = localStorage.getItem('usuario');
    this.usuario = raw ? JSON.parse(raw) : {};
    this.formDatos = {
      nombre_completo: this.usuario.nombre_completo || '',
      correo: this.usuario.correo || '',
      telefono: this.usuario.telefono || '',
      direccion: this.usuario.direccion || ''
    };
  }

  private cargarVehiculos(): void {
    this.usuarioService.obtenerTodosLosVehiculos().subscribe({
      next: (data) => { this.vehiculos = data; },
      error: () => console.error('Error cargando vehículos')
    });
  }

  private cargarHistorial(): void {
    this.miHistorial = [];
  }

  iniciales(): string {
    const nombre = this.usuario?.nombre_completo || '';
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    return partes.length > 0 ? (partes[0][0] + (partes[1]?.[0] || '')).toUpperCase() : '?';
  }

  iconoVehiculo(tipo: string): string {
    return this.iconosVehiculo[tipo] || 'ti-car';
  }

  abrirModalVehiculo(v?: MiVehiculo): void {
    this.formVehiculo = v ? { ...v } : { tipoVehiculo: 'auto', placa: '', marca: '', modelo: '' };
    this.mostrarModalVehiculo = true;
  }

  guardarVehiculo(): void {
    this.cargando = true;
    const obs = this.formVehiculo.id_vehiculo 
      ? this.usuarioService.actualizarVehiculo(this.formVehiculo.id_vehiculo, this.formVehiculo)
      : this.usuarioService.agregarVehiculo(this.formVehiculo);

    obs.subscribe({
      next: () => { this.mostrarExito('Guardado correctamente'); this.cargarVehiculos(); this.cerrarModales(); this.cargando = false; },
      error: () => { alert('Error'); this.cargando = false; }
    });
  }

  abrirModalDatos(): void { this.mostrarModalDatos = true; }
  
  guardarDatos(): void {
    this.usuarioService.updateMiPerfil(this.formDatos).subscribe({
      next: (data) => {
        this.usuario = { ...this.usuario, ...data };
        localStorage.setItem('usuario', JSON.stringify(this.usuario));
        this.mostrarExito('Datos actualizados');
        this.cerrarModales();
      }
    });
  }

  abrirModalPassword(): void { this.mostrarModalPassword = true; }

  guardarPassword(): void {
    if (this.formPassword.nueva === this.formPassword.confirmar) {
      this.mostrarExito('Contraseña actualizada');
      this.cerrarModales();
    }
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