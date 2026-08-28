import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../servicios/admin/admin';
import { AuthService } from '../../servicios/auth/auth';
import { HistorialReportesComponent } from '../historial-reportes/historial-reportes';

type Vista = 'panel' | 'solicitudes' | 'usuarios' | 'reportes';

export interface Conductor {
  id_usuario?: string;
  id_vehiculo?: string;
  cedula?: string;
  nombre: string;
  correo: string;
  rol: string;
  telefono?: string;
  direccion?: string;
  ficha?: string;
  nombre_emergencia?: string;
  contacto_emergencia?: string;
  tipoVehiculo: string;
  placa: string;
  biometriaCapturada: boolean;
}

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
  selector: 'app-dashboard-administrador',
  standalone: true,
  imports: [CommonModule, FormsModule, HistorialReportesComponent],
  templateUrl: './dashboard-administrador.html',
  styleUrls: ['./dashboard-administrador.css'],
})
export class AdminDashboardComponent implements OnInit {
  vistaActual: Vista = 'panel';

  kpis = {
    vehiculosRegistrados: 0,
    ingresosHoy: 0,
    accesosDenegados: 0,
  };

  usuariosPendientes: any[] = [];
  cargandoSolicitudes = false;
  cargandoHistorial = false;
  mensajeExito: string | null = null;

  conductores: Conductor[] = [];
  mostrarModalConductor = false;
  conductorEnEdicion: Conductor | null = null;
  formConductor: Conductor = this.conductorVacio();

  historial: RegistroHistorial[] = [];
  filtros = {
    desde: '',
    hasta: '',
    tipoVehiculo: 'todos',
    tipoMovimiento: 'todos',
  };

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarKpis();
    this.cargarUsuariosPendientes();
    this.cargarHistorial();
  }

  get mostrarModal(): boolean {
    return this.mostrarModalConductor;
  }

  set mostrarModal(val: boolean) {
    this.mostrarModalConductor = val;
  }

  get editando(): boolean {
    return !!this.conductorEnEdicion;
  }

  get cargando(): boolean {
    return this.cargandoSolicitudes;
  }

  get formUsuario(): any {
    return {
      id_usuario: this.formConductor.id_usuario,
      nombre_completo: this.formConductor.nombre,
      correo: this.formConductor.correo,
      telefono: this.formConductor.telefono || '',
      direccion: this.formConductor.direccion || '',
      ficha: this.formConductor.ficha || '',
      rol: this.formConductor.rol,
      nombre_emergencia: this.formConductor.nombre_emergencia || '',
      contacto_emergencia: this.formConductor.contacto_emergencia || '',
      tipo_vehiculo: this.formConductor.tipoVehiculo,
      placa: this.formConductor.placa,
    };
  }

  set formUsuario(val: any) {
    if (!val) return;
    this.formConductor.id_usuario = val.id_usuario;
    this.formConductor.nombre = val.nombre_completo || val.nombre || '';
    this.formConductor.correo = val.correo || '';
    this.formConductor.telefono = val.telefono || '';
    this.formConductor.direccion = val.direccion || '';
    this.formConductor.ficha = val.ficha || '';
    this.formConductor.rol = val.rol || 'aprendiz';
    this.formConductor.nombre_emergencia = val.nombre_emergencia || '';
    this.formConductor.contacto_emergencia = val.contacto_emergencia || '';
    this.formConductor.tipoVehiculo = val.tipo_vehiculo || val.tipoVehiculo || 'auto';
    this.formConductor.placa = val.placa || '';
  }

  cerrarModal(): void {
    this.cerrarModalConductor();
  }

  guardarUsuario(): void {
    this.guardarConductor();
  }

  irA(vista: Vista): void {
    this.vistaActual = vista;
    if (vista === 'usuarios') this.cargarConductores();
    if (vista === 'reportes') this.cargarHistorial();
  }

  irAPanel(): void {
    this.vistaActual = 'panel';
    this.cargarKpis();
  }

  breadcrumb(): string {
    const nombres: Record<Vista, string> = {
      panel: 'gestión institucional de accesos',
      solicitudes: 'autorizaciones pendientes',
      usuarios: 'gestión de usuarios y conductores',
      reportes: 'reportes e historial',
    };
    return nombres[this.vistaActual];
  }

  private cargarKpis(): void {
    this.authService.getEstadisticasAdmin().subscribe({
      next: (res: any) => {
        this.kpis = {
          vehiculosRegistrados: res.total_vehiculos || 0,
          ingresosHoy: res.ingresos_hoy || 0,
          accesosDenegados: res.accesos_denegados || 0,
        };
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando KPIs:', err),
    });
  }

  cargarUsuariosPendientes(): void {
    this.cargandoSolicitudes = true;
    this.authService.getUsuariosPendientes().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.usuariosPendientes = data;
        } else if (data && Array.isArray(data.usuarios)) {
          this.usuariosPendientes = data.usuarios;
        } else {
          this.usuariosPendientes = [];
        }
        this.cargandoSolicitudes = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar usuarios pendientes:', err);
        this.cargandoSolicitudes = false;
        this.cdr.detectChanges();
      },
    });
  }

  aceptarCuenta(idUsuario: string): void {
    this.authService.aprobarUsuario(idUsuario).subscribe({
      next: (res: any) => {
        this.mensajeExito = res.message || res.mensaje || 'Usuario aprobado con éxito';
        this.usuariosPendientes = this.usuariosPendientes.filter((u) => u.id_usuario !== idUsuario);
        this.cdr.detectChanges();
        setTimeout(() => {
          this.mensajeExito = null;
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => console.error('Error al aprobar el usuario:', err),
    });
  }

  rechazarCuenta(idUsuario: string): void {
    this.authService.rechazarUsuario(idUsuario).subscribe({
      next: () => {
        this.usuariosPendientes = this.usuariosPendientes.filter((u) => u.id_usuario !== idUsuario);
        this.mensajeExito = 'Solicitud rechazada y eliminada del sistema';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.mensajeExito = null;
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        console.error('Error al rechazar el usuario en el backend:', err);
        alert('Hubo un error al rechazar la solicitud.');
      },
    });
  }

  normalizarTipoVehiculo(tipo?: string): string {
    if (!tipo) return 'AUTOMOVIL';
    const clean = tipo.trim().toUpperCase();
    if (clean === 'AUTO' || clean === 'AUTOMOVIL' || clean === 'CARRO') return 'AUTOMOVIL';
    if (clean === 'MOTO' || clean === 'MOTOCICLETA') return 'MOTOCICLETA';
    if (clean === 'BICICLETA' || clean === 'BICI') return 'BICICLETA';
    if (clean === 'PATIN' || clean === 'PATINETA' || clean === 'SCOOTER') return 'PATIN';
    if (clean === 'ELECTRICO' || clean === 'ELECTR') return 'ELECTRICO';
    return clean;
  }

  private cargarConductores(): void {
    this.cargandoSolicitudes = true;
    this.authService.getUsuarios().subscribe({
      next: (data: any[]) => {
        const usuariosArray = Array.isArray(data) ? data : [];
        this.conductores = usuariosArray.map((u) => ({
          id_usuario: u.id_usuario || u.id,
          id_vehiculo:
            u.vehiculos && u.vehiculos.length > 0
              ? u.vehiculos[0].id_vehiculo || u.vehiculos[0].id
              : undefined,
          cedula: u.cedula || 'N/A',
          nombre: (u.nombre_completo || u.nombre || 'Sin Nombre').toUpperCase(),
          correo: u.correo || '',
          rol: u.rol || 'aprendiz',
          telefono: u.telefono || '',
          direccion: u.direccion || '',
          ficha: u.ficha || '',
          nombre_emergencia: u.nombre_emergencia || '',
          contacto_emergencia: u.contacto_emergencia || '',
          tipoVehiculo: this.normalizarTipoVehiculo(
            u.vehiculos && u.vehiculos.length > 0
              ? u.vehiculos[0].tipo_vehiculo || u.vehiculos[0].tipoVehiculo
              : 'AUTOMOVIL'
          ),
          placa: u.vehiculos && u.vehiculos.length > 0 ? u.vehiculos[0].placa : 'N/A',
          biometriaCapturada: u.estado === 'activo' || u.is_active === true,
        }));
        this.conductores = [...this.conductores];
        this.cargandoSolicitudes = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar conductores:', err);
        this.cargandoSolicitudes = false;
        this.cdr.detectChanges();
      },
    });
  }

  private conductorVacio(): Conductor {
    return {
      cedula: '',
      nombre: '',
      correo: '',
      rol: 'aprendiz',
      telefono: '',
      direccion: '',
      ficha: '',
      nombre_emergencia: '',
      contacto_emergencia: '',
      tipoVehiculo: 'AUTOMOVIL',
      placa: '',
      biometriaCapturada: false,
    };
  }

  abrirModalConductor(): void {
    this.conductorEnEdicion = null;
    this.formConductor = this.conductorVacio();
    this.mostrarModalConductor = true;
  }

  editarConductor(c: Conductor): void {
    this.conductorEnEdicion = c;
    this.formConductor = {
      ...c,
      tipoVehiculo: this.normalizarTipoVehiculo(c.tipoVehiculo)
    };
    this.mostrarModalConductor = true;
    this.cdr.detectChanges();
  }

  cerrarModalConductor(): void {
    this.mostrarModalConductor = false;
  }

  capturarBiometria(): void {
    this.formConductor.biometriaCapturada = true;
  }

  guardarConductor(): void {
  if (!this.formConductor.nombre || !this.formConductor.nombre.trim()) {
    alert('Por favor, ingresa el nombre completo.');
    return;
  }

  if (!this.formConductor.correo || !this.formConductor.correo.trim()) {
    alert('Por favor, ingresa el correo electrónico.');
    return;
  }

  this.cargandoSolicitudes = true;

  const placaLimpia = this.formConductor.placa
    ? this.formConductor.placa.trim().replace(/[- ]/g, '').toUpperCase()
    : '';

  const idObjetivo = this.conductorEnEdicion?.id_usuario || this.formConductor.id_usuario;

  if (this.editando && idObjetivo) {
    const tipoVehiculoNorm = this.normalizarTipoVehiculo(this.formConductor.tipoVehiculo);
    const usuarioPayload = {
      id_usuario: idObjetivo,
      nombre_completo: this.formConductor.nombre.trim(),
      correo: this.formConductor.correo.trim(),
      rol: this.formConductor.rol,
      telefono: this.formConductor.telefono ? this.formConductor.telefono.trim() : '',
      direccion: this.formConductor.direccion ? this.formConductor.direccion.trim() : '',
      ficha: this.formConductor.ficha ? this.formConductor.ficha.trim() : '',
      nombre_emergencia: this.formConductor.nombre_emergencia ? this.formConductor.nombre_emergencia.trim() : '',
      contacto_emergencia: this.formConductor.contacto_emergencia ? this.formConductor.contacto_emergencia.trim() : '',
      placa: placaLimpia,
      tipo_vehiculo: tipoVehiculoNorm
    };

    this.authService.actualizarUsuarioAdmin(idObjetivo, usuarioPayload).subscribe({
      next: (res: any) => {
        alert('¡Conductor y vehículo actualizados correctamente!');
        this.finalizarGuardado();
      },
      error: (err) => {
        console.error('Error al actualizar:', err);
        let mensajeError = 'Error al actualizar los datos en el servidor.';
        if (err.error) {
          if (typeof err.error === 'string') {
            mensajeError = err.error;
          } else if (err.error.placa) {
            mensajeError = Array.isArray(err.error.placa) ? err.error.placa[0] : err.error.placa;
          } else if (err.error.correo) {
            mensajeError = Array.isArray(err.error.correo) ? err.error.correo[0] : err.error.correo;
          } else if (err.error.detail) {
            mensajeError = err.error.detail;
          } else if (err.error.error) {
            mensajeError = err.error.error;
          } else if (typeof err.error === 'object') {
            const primero = Object.values(err.error)[0];
            if (primero) mensajeError = Array.isArray(primero) ? primero[0] : String(primero);
          }
        }
        alert(mensajeError);
        this.cargandoSolicitudes = false;
        this.cdr.detectChanges();
      }
    });
    
  } else {
    const partesNombre = this.formConductor.nombre.trim().split(' ');
    const nombres = partesNombre[0] || '';
    const apellidos = partesNombre.slice(1).join(' ') || 'SENA';

    const nuevoPayload = {
      nombres: nombres,
      apellidos: apellidos,
      correo: this.formConductor.correo.trim(),
      password: 'UsuarioOmniDoor2026*',
      rol: this.formConductor.rol || 'aprendiz',
      telefono: this.formConductor.telefono ? this.formConductor.telefono.trim() : '',
      direccion: this.formConductor.direccion ? this.formConductor.direccion.trim() : '',
      ficha: this.formConductor.ficha ? this.formConductor.ficha.trim() : '',
      nombre_emergencia: this.formConductor.nombre_emergencia ? this.formConductor.nombre_emergencia.trim() : '',
      contacto_emergencia: this.formConductor.contacto_emergencia ? this.formConductor.contacto_emergencia.trim() : '',
      placa: placaLimpia,
      tipo_vehiculo: this.formConductor.tipoVehiculo ? this.formConductor.tipoVehiculo.toUpperCase() : 'AUTO'
    };

    this.authService.register(nuevoPayload).subscribe({
      next: (res: any) => {
        const idCreado = res.usuario?.id_usuario;
        if (idCreado) {
          this.authService.aprobarUsuario(idCreado).subscribe({
            next: () => {
              alert('¡Nuevo conductor registrado y activado con éxito!');
              this.finalizarGuardado();
            },
            error: () => {
              alert('Conductor creado exitosamente.');
              this.finalizarGuardado();
            }
          });
        } else {
          alert('¡Conductor registrado correctamente!');
          this.finalizarGuardado();
        }
      },
      error: (err) => {
        console.error('Error al crear conductor:', err);
        const msg = err.error?.correo?.[0] || err.error?.placa?.[0] || 'Error al registrar el nuevo conductor.';
        alert(msg);
        this.cargandoSolicitudes = false;
        this.cdr.detectChanges();
      }
    });
  }
}

  private finalizarGuardado(): void {
    this.cerrarModalConductor();
    this.cargarConductores();
  }

  eliminarConductor(c: Conductor): void {
    if (!c.id_usuario) {
      alert(`Error: El usuario ${c.nombre} no tiene un ID asignado.`);
      return;
    }

    if (confirm(`¿Estás seguro de eliminar permanentemente a ${c.nombre}?`)) {
      this.cargandoSolicitudes = true;
      this.authService.eliminarUsuarioAdmin(c.id_usuario).subscribe({
        next: () => {
          alert('Usuario eliminado correctamente.');
          this.cargarConductores();
          this.cargarKpis();
        },
        error: (err) => {
          console.error('Error al eliminar:', err);
          alert('Hubo un error en el servidor al intentar eliminar el registro.');
          this.cargandoSolicitudes = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  private cargarHistorial(): void {
    this.cargandoHistorial = true;

    this.authService.getHistorialGeneral().subscribe({
      next: (res: any) => {
        let historialArray: any[] = [];

        if (Array.isArray(res)) {
          historialArray = res;
        } else if (res && Array.isArray(res.recientes)) {
          historialArray = res.recientes;
        } else if (res && Array.isArray(res.results)) {
          historialArray = res.results;
        } else if (res && Array.isArray(res.registros)) {
          historialArray = res.registros;
        }

        this.historial = historialArray.map((reg) => {
          const usuarioReal =
            reg.conductor ||
            reg.nombre_conductor ||
            reg.nombre_conductor_manual ||
            reg.usuario?.nombre_completo ||
            reg.usuario?.nombre ||
            reg.nombre_completo ||
            'Sin Especificar';

          const tipoVehiculoReal =
            reg.vehiculo?.tipo_vehiculo ||
            reg.vehiculo?.tipoVehiculo ||
            reg.tipo_vehiculo ||
            reg.vehiculo ||
            'Peatonal';

          let placaCapturada =
            reg.placa ||
            reg.vehiculo?.placa ||
            reg.placa_vehiculo ||
            reg.placa_manual ||
            reg.placa_texto;

          const fechaRawObj = reg.fecha_hora || reg.hora_fecha || reg.fecha;
          const fechaObj = fechaRawObj ? new Date(fechaRawObj) : new Date();

          let eventoReal = (
            reg.tipo_movimiento ||
            reg.movimiento ||
            reg.evento ||
            'ENTRADA'
          ).toUpperCase();
          if (eventoReal.includes('APERTURA') || eventoReal.includes('MANUAL')) {
            eventoReal = 'APERTURA_MANUAL';
          } else if (eventoReal.includes('SALIDA')) {
            eventoReal = 'SALIDA';
          } else if (eventoReal.includes('ENTRADA')) {
            eventoReal = 'ENTRADA';
          }

          return {
            fechaRaw: fechaObj,
            fechaHora: `${fechaObj.toLocaleDateString()} ${fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            usuario: usuarioReal,
            tipoVehiculo: String(tipoVehiculoReal).toUpperCase(),
            placa: placaCapturada ? String(placaCapturada).trim().toUpperCase() : 'N/A',
            metodoValidacion: reg.metodo_validacion || reg.acreditacion || 'Biometría Facial',
            evento: eventoReal,
            sincronizado: reg.sincronizado !== undefined ? reg.sincronizado : true,
          };
        });

        this.cargandoHistorial = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando historial:', err);
        this.cargandoHistorial = false;
        this.cdr.detectChanges();
      },
    });
  }

  formatearPlaca(): void {
    if (!this.formConductor.placa) return;
    let limpia = this.formConductor.placa.replace(/[\s-]/g, '').toUpperCase();
    if (limpia.length > 3) {
      const letras = limpia.substring(0, 3);
      const numeros = limpia.substring(3, 7);
      this.formConductor.placa = `${letras}-${numeros}`;
    } else {
      this.formConductor.placa = limpia;
    }
  }

  exportar(formato: 'pdf' | 'excel'): void {
    console.log('Exportando historial en formato', formato, this.filtros);
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
