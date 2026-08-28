import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../servicios/auth/auth';
import { UsuarioService } from '../../servicios/usuarios/usuarios';

export interface MiVehiculo {
  id_vehiculo?: number | string;
  tipo_vehiculo?: string;
  tipoVehiculo?: string;
  tipo?: string;
  placa?: string;
  marca?: string;
  modelo?: string;
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
export class DashboardUsuarioComponent implements OnInit, OnDestroy {
  usuario: any = {};
  vehiculos: MiVehiculo[] = [];
  miHistorial: RegistroMioHistorial[] = [];

  mensajeExito: string | null = null;
  mostrarModalVehiculo = false;
  mostrarModalDatos = false;
  mostrarModalPassword = false;
  cargando = false;

  formVehiculo: MiVehiculo = { tipo_vehiculo: 'AUTO', tipoVehiculo: 'AUTO', placa: '', marca: '', modelo: '' };
  formDatos = { nombre_completo: '', correo: '', telefono: '', direccion: '', ficha: '' };
  formPassword = { actual: '', nueva: '', confirmar: '' };

  private destroy$ = new Subject<void>();

  private iconosVehiculo: Record<string, string> = {
    auto: 'ti-car',
    automovil: 'ti-car',
    moto: 'ti-motorbike',
    motocicleta: 'ti-motorbike',
    bici: 'ti-bike',
    bicicleta: 'ti-bike',
    patin: 'ti-skateboard',
    electr: 'ti-plug',
    electrico: 'ti-plug'
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private usuarioService: UsuarioService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.cargarUsuario();
    this.cargarVehiculos();
    this.cargarHistorial();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarUsuario(): void {
    const raw = localStorage.getItem('usuario');
    this.usuario = raw ? JSON.parse(raw) : {};
    this.formDatos = {
      nombre_completo: this.usuario.nombre_completo || '',
      correo: this.usuario.correo || '',
      telefono: this.usuario.telefono || '',
      direccion: this.usuario.direccion || '',
      ficha: this.usuario.ficha || ''
    };
  }

  cargarVehiculos(): void {
    this.usuarioService.obtenerTodosLosVehiculos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any[]) => {
          this.vehiculos = data;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error cargando vehículos:', err);
        }
      });
  }

  private cargarHistorial(): void {
    this.usuarioService.obtenerMiHistorial()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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

  iconoVehiculo(tipo?: string): string {
    const tipoNormalizado = (tipo || 'AUTO').toLowerCase();
    return this.iconosVehiculo[tipoNormalizado] || 'ti-car';
  }

  abrirModalVehiculo(v?: MiVehiculo): void {
    const tipoDefecto = v?.tipo_vehiculo || v?.tipoVehiculo || v?.tipo || 'AUTO';
    this.formVehiculo = v ? { ...v, tipo_vehiculo: tipoDefecto, tipoVehiculo: tipoDefecto } : { tipo_vehiculo: 'AUTO', tipoVehiculo: 'AUTO', placa: '', marca: '', modelo: '' };
    this.mostrarModalVehiculo = true;
    this.cdr.detectChanges();
  }

  guardarVehiculo(): void {
  if (this.cargando) return;

  const tipoRaw = (this.formVehiculo.tipo_vehiculo || this.formVehiculo.tipoVehiculo || 'AUTO').toString().trim().toUpperCase();
  const tipoNormalizado = tipoRaw.toLowerCase();

  if (!this.formVehiculo.marca?.trim() || !this.formVehiculo.modelo?.trim()) {
    alert('Por favor, ingresa la marca y el modelo del vehículo.');
    return;
  }
  const esExentoPlaca = ['bici', 'bicicleta', 'patin', 'patineta', 'electr', 'electrico', 'peatonal'].some(t => tipoNormalizado.includes(t));

  if (esExentoPlaca) {
    this.formVehiculo.placa = 'S_PLACA';
  } else {
    if (!this.formVehiculo.placa || !this.formVehiculo.placa.trim()) {
      alert('Por favor, ingresa la placa del vehículo.');
      return;
    }

    const placaLimpia = this.formVehiculo.placa.trim().replace(/[- ]/g, '').toUpperCase();
    this.formVehiculo.placa = placaLimpia;

    if (tipoNormalizado.includes('moto')) {
      const regexMoto = /^[A-Z]{3}-?\d{2}[A-Z]$/;
      if (!regexMoto.test(placaLimpia)) {
        alert('Formato de placa de motocicleta inválido. Debe ser de tipo ABC12D o ABC-12D.');
        return;
      }
    } else {
      const regexCarro = /^[A-Z]{3}-?\d{3}$/;
      if (!regexCarro.test(placaLimpia)) {
        alert('Formato de placa de automóvil inválido. Debe ser de tipo ABC123 o ABC-123.');
        return;
      }
    }
  }

  this.cargando = true;

  const payloadBackend: any = {
    tipo_vehiculo: tipoRaw,
    tipoVehiculo: tipoRaw,
    placa: this.formVehiculo.placa,
    marca: this.formVehiculo.marca ? this.formVehiculo.marca.trim().toUpperCase() : '',
    modelo: this.formVehiculo.modelo ? this.formVehiculo.modelo.trim().toUpperCase() : ''
  };

  const obs = this.formVehiculo.id_vehiculo
    ? this.usuarioService.actualizarVehiculo(this.formVehiculo.id_vehiculo, payloadBackend)
    : this.usuarioService.agregarVehiculo(payloadBackend);

  obs.pipe(takeUntil(this.destroy$)).subscribe({
    next: () => {
      this.cargando = false;
      this.cerrarModales();
      this.mostrarExito(this.formVehiculo.id_vehiculo ? 'Vehículo actualizado' : 'Vehículo registrado');
      this.cargarVehiculos();
    },
    error: (err) => {
      console.error('Error del servidor:', err);
      alert('Error al guardar el vehículo. Revisa que los datos ingresados sean válidos.');
      this.cargando = false;
      this.cdr.detectChanges();
    }
  });
}

  eliminarVehiculo(id?: string | number): void {
    if (!id) return;
    if (confirm('¿Estás seguro de que deseas eliminar este vehículo?')) {
      this.cargando = true;
      this.usuarioService.eliminarVehiculo(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
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
    if (!this.formDatos.nombre_completo.trim() || !this.formDatos.telefono.trim()) {
      alert('Los campos Nombre y Teléfono son obligatorios.');
      return;
    }

    this.cargando = true;
    const payload = {
      nombre_completo: this.formDatos.nombre_completo.trim(),
      telefono: this.formDatos.telefono.trim(),
      direccion: this.formDatos.direccion.trim(),
      ficha: this.formDatos.ficha.trim()
    };

    this.usuarioService.updateMiPerfil(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cargando = false;
          this.formPassword = { actual: '', nueva: '', confirmar: '' };
          this.cerrarModales();
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