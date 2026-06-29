import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
    private usuarioService: UsuarioService,
    private cdr: ChangeDetectorRef
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

  cargarVehiculos(): void {
    this.usuarioService.obtenerTodosLosVehiculos().subscribe({
      next: (data) => { 
        this.vehiculos = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando vehículos:', err);
      }
    });
  }

  private cargarHistorial(): void {
    this.usuarioService.obtenerMiHistorial().subscribe({
      next: (data) => {
        this.miHistorial = [...data];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando historial:', err);
      }
    });
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
    this.cdr.detectChanges();
  }

  guardarVehiculo(): void {
    if (this.cargando) return;

    const tipo = this.formVehiculo.tipoVehiculo;
    
    if (!this.formVehiculo.marca?.trim() || !this.formVehiculo.modelo?.trim()) {
      alert('Por favor, ingresa la marca y el modelo del vehículo.');
      return;
    }

    if (tipo === 'bici' || tipo === 'patin' || tipo === 'electr') {
      this.formVehiculo.placa = 'N/A';
    } else {
      if (!this.formVehiculo.placa || !this.formVehiculo.placa.trim()) {
        alert('Por favor, ingresa la placa del vehículo.');
        return;
      }

      const placaLimpia = this.formVehiculo.placa.trim().toUpperCase();
      this.formVehiculo.placa = placaLimpia;

      if (tipo === 'moto') {
        const regexMoto = /^[A-Z]{3}-\d{2}[A-Z]$/;
        if (!regexMoto.test(placaLimpia)) {
          alert('Formato de placa de motocicleta inválido. Debe ser de tipo ABC-12D (con guión).');
          return;
        }
      } else if (tipo === 'auto') {
        const regexCarro = /^[A-Z]{3}-\d{3}$/;
        if (!regexCarro.test(placaLimpia)) {
          alert('Formato de placa de automóvil inválido. Debe ser de tipo ABC-123 (con guión).');
          return;
        }
      }
    }

    this.cargando = true;
    
    const obs = this.formVehiculo.id_vehiculo 
      ? this.usuarioService.actualizarVehiculo(this.formVehiculo.id_vehiculo, this.formVehiculo)
      : this.usuarioService.agregarVehiculo(this.formVehiculo);

    obs.subscribe({
      next: () => { 
        this.cargando = false; 
        this.cerrarModales(); 
        this.mostrarExito(this.formVehiculo.id_vehiculo ? 'Vehículo actualizado' : 'Vehículo registrado'); 
        this.cargarVehiculos(); 
      },
      error: (err) => { 
        console.error('Error del servidor:', err);
        alert('Error al guardar el vehículo. Revisa que la placa no esté duplicada.'); 
        this.cargando = false; 
        this.cdr.detectChanges();
      }
    });
  }

  eliminarVehiculo(id: string | undefined): void {
    if (!id) return;
    if (confirm('¿Estás seguro de que deseas eliminar este vehículo?')) {
      this.cargando = true;
      this.usuarioService.eliminarVehiculo(id).subscribe({
        next: () => {
          this.cargando = false;
          this.mostrarExito('Vehículo eliminado correctamente');
          this.cargarVehiculos();
        },
        error: () => {
          alert('Error al intentar eliminar el vehículo');
          this.cargando = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  abrirModalDatos(): void { 
    this.mostrarModalDatos = true; 
    this.cdr.detectChanges();
  }
  
  guardarDatos(): void {
    if (this.cargando) return;
    if (!this.formDatos.nombre_completo.trim() || !this.formDatos.correo.trim() || !this.formDatos.telefono.trim()) {
      alert('Los campos Nombre, Correo y Teléfono son obligatorios.');
      return;
    }

    this.cargando = true;
    this.usuarioService.updateMiPerfil(this.formDatos).subscribe({
      next: (data) => {
        this.cargando = false;
        this.usuario = { ...this.usuario, ...data };
        localStorage.setItem('usuario', JSON.stringify(this.usuario));
        this.cerrarModales();
        this.mostrarExito('Datos actualizados correctamente');
      },
      error: (err) => {
        console.error('Error al actualizar datos:', err);
        alert('No se pudieron actualizar los datos del perfil.');
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirModalPassword(): void { 
    this.mostrarModalPassword = true; 
    this.cdr.detectChanges();
  }

  guardarPassword(): void {
    if (!this.formPassword.actual || !this.formPassword.nueva || !this.formPassword.confirmar) {
      alert('Todos los campos de contraseña son obligatorios.');
      return;
    }

    if (this.formPassword.nueva.length < 8) {
      alert('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (this.formPassword.nueva !== this.formPassword.confirmar) {
      alert('Las contraseñas nuevas no coinciden.');
      return;
    }

    this.cargando = true;
    this.usuarioService.cambiarPassword({
      password_actual: this.formPassword.actual,
      password_nueva: this.formPassword.nueva
    }).subscribe({
      next: (res) => {
        this.cargando = false;
        this.formPassword = { actual: '', nueva: '', confirmar: '' };
        this.cerrarModales();
        alert('¡Contraseña actualizada con éxito!');
        this.mostrarExito('Contraseña actualizada correctamente.');
      },
      error: (err) => {
        console.error(err);
        alert(err.error?.error || 'La contraseña actual es incorrecta.');
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cerrarModales(): void {
    this.mostrarModalVehiculo = false;
    this.mostrarModalDatos = false;
    this.mostrarModalPassword = false;
    this.cdr.detectChanges();
  }

  private mostrarExito(msg: string): void {
    this.mensajeExito = msg;
    this.cdr.detectChanges();
    setTimeout(() => { 
      this.mensajeExito = null; 
      this.cdr.detectChanges();
    }, 3000);
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}