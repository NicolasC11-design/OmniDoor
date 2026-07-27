import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../servicios/admin';
import { AuthService } from '../../servicios/auth';

type Vista = 'panel' | 'solicitudes' | 'usuarios' | 'reportes';

export interface Conductor {
  id_usuario?: string;
  id_vehiculo?: string;
  cedula: string;
  nombre: string;
  correo: string;
  rol: string;
  tipoVehiculo: string;
  placa: string;
  biometriaCapturada: boolean;
}

export interface RegistroHistorial {
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
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-administrador.html',
  styleUrls: ['./dashboard-administrador.css']
})
export class AdminDashboard implements OnInit {
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
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.cargarKpis();
    this.cargarUsuariosPendientes();
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
      error: (err) => console.error('Error cargando KPIs:', err)
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
      }
    });
  }

  aceptarCuenta(idUsuario: string): void {
    this.authService.aprobarUsuario(idUsuario).subscribe({
      next: (res: any) => {
        this.mensajeExito = res.message || res.mensaje || 'Usuario aprobado con éxito';
        this.usuariosPendientes = this.usuariosPendientes.filter(u => u.id_usuario !== idUsuario);
        this.cdr.detectChanges();
        setTimeout(() => { this.mensajeExito = null; this.cdr.detectChanges(); }, 3000);
      },
      error: (err) => console.error('Error al aprobar el usuario:', err)
    });
  }

  rechazarCuenta(idUsuario: string): void {
    this.authService.rechazarUsuario(idUsuario).subscribe({
      next: (res: any) => {
        this.usuariosPendientes = this.usuariosPendientes.filter(u => u.id_usuario !== idUsuario);
        this.mensajeExito = 'Solicitud rechazada y eliminada del sistema';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.mensajeExito = null;
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        console.error('Error al rechazar el usuario en el backend:', err);
        alert('Hubo un error al rechazar la solicitud. Revisa la consola.');
      }
    });
  }

  private cargarConductores(): void {
    this.cargandoSolicitudes = true;
    this.authService.getUsuarios().subscribe({
      next: (data: any[]) => {
        this.conductores = data.map(u => ({
          id_usuario: u.id_usuario || u.id,
          id_vehiculo: u.vehiculos && u.vehiculos.length > 0 ? (u.vehiculos[0].id_vehiculo || u.vehiculos[0].id) : undefined,
          cedula: u.cedula || 'N/A',
          nombre: (u.nombre_completo || u.nombre || 'Sin Nombre').toUpperCase(),
          correo: u.correo || '',
          rol: u.rol || 'aprendiz',
          tipoVehiculo: u.vehiculos && u.vehiculos.length > 0 ? u.vehiculos[0].tipoVehiculo : 'auto',
          placa: u.vehiculos && u.vehiculos.length > 0 ? u.vehiculos[0].placa : 'N/A',
          biometriaCapturada: u.estado === 'activo'
        }));
        this.cargandoSolicitudes = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar conductores:', err);
        this.cargandoSolicitudes = false;
        this.cdr.detectChanges();
      }
    });
  }

  private conductorVacio(): Conductor {
    return {
      cedula: '',
      nombre: '',
      rol: 'aprendiz',
      correo: '',
      tipoVehiculo: 'auto',
      placa: '',
      biometriaCapturada: false
    };
  }

  abrirModalConductor(): void {
    this.conductorEnEdicion = null;
    this.formConductor = this.conductorVacio();
    this.mostrarModalConductor = true;
  }

  editarConductor(c: Conductor): void {
    this.conductorEnEdicion = c;
    this.formConductor = { ...c };
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

    if (this.conductorEnEdicion && this.conductorEnEdicion.id_usuario) {
      this.cargandoSolicitudes = true;
      const usuarioPayload = {
        nombre_completo: this.formConductor.nombre.trim(),
        rol: this.formConductor.rol,
        correo: this.formConductor.correo
      };
      const vehiculoPayload = {
        placa: this.formConductor.placa.trim(),
        tipoVehiculo: this.formConductor.tipoVehiculo
      };
      this.authService.actualizarUsuarioAdmin(this.conductorEnEdicion.id_usuario, usuarioPayload).subscribe({
        next: () => {
          if (this.conductorEnEdicion?.id_vehiculo) {
            this.authService.actualizarVehiculoAdmin(this.conductorEnEdicion.id_vehiculo, vehiculoPayload).subscribe({
              next: () => {
                alert('¡Conductor y Vehículo actualizados correctamente!');
                this.finalizarGuardado();
              },
              error: (vErr) => {
                console.error('Error al actualizar el vehículo:', vErr);
                alert('Se actualizó el usuario, pero falló la actualización del vehículo.');
                this.finalizarGuardado();
              }
            });
          } else {
            alert('¡Usuario actualizado con éxito!');
            this.finalizarGuardado();
          }
        },
        error: (err) => {
          console.error('Error al actualizar usuario:', err);
          alert('Error al actualizar el usuario.');
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
        }
      });
    }
  }

  private cargarHistorial(): void {
  this.cargandoHistorial = true;

  this.authService.getHistorialGeneral().subscribe({
    next: (data: any[]) => {
      console.log('Historial directo del Backend:', data);

      this.historial = data.map(reg => {
        
        const usuarioReal =
          reg.usuario?.nombre_completo ||
          reg.usuario?.nombre ||
          reg.nombre_completo ||
          reg.nombre_conductor ||
          reg.vehiculo?.propietario?.nombre_completo ||
          reg.vehiculo?.propietario?.nombre ||
          reg.nombre_conductor_manual ||
          'Sin Especificar';

        const tipoVehiculoReal =
          reg.vehiculo?.tipoVehiculo ||
          reg.vehiculo?.tipo_vehiculo ||
          reg.tipo_vehiculo ||
          reg.vehiculo ||
          'Peatonal';

        let placaCapturada =
          reg.placa ||
          reg.vehiculo?.placa ||
          reg.placa_vehiculo ||
          reg.placa_texto ||
          reg.placa_detectada ||
          reg.placa_manual ||
          reg.detalles?.placa ||
          reg.vehiculo_placa;

        if (!placaCapturada && typeof reg.vehiculo === 'string' && reg.vehiculo !== 'BICICLETA' && reg.vehiculo !== 'PATIN') {
          placaCapturada = reg.vehiculo;
        }

        const tipoVehiculoNormalizado = String(tipoVehiculoReal).toUpperCase();
        const placaLimpia = placaCapturada ? String(placaCapturada).trim().toUpperCase() : '';

        const esVehiculoSinPlaca =
          ['BICICLETA', 'PATIN', 'PATINETA', 'ELECTRICO', 'PEATONAL'].some(tipo => tipoVehiculoNormalizado.includes(tipo)) ||
          ['S_PLACA', 'SIN_PLACA', 'SIN PLACA', 'UNDEFINED', 'NULL', ''].includes(placaLimpia);

        const placaReal = esVehiculoSinPlaca ? 'N/A' : placaLimpia;

        let fechaHoraFormateada = 'Fecha Desconocida';
        if (reg.fecha_hora) {
          const dateObj = new Date(reg.fecha_hora);
          fechaHoraFormateada = `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        let metodo = 'Biometría Facial';
        if (reg.metodo_validacion) {
          metodo = reg.metodo_validacion;
        } else if (reg.tipo_movimiento?.toUpperCase().includes('MANUAL')) {
          metodo = 'Manual (Guarda)';
        } else if (reg.vehiculo) {
          metodo = 'OCR Placa';
        }

        const tipoMovString = (
          reg.evento || 
          reg.tipo_movimiento || 
          reg.tipo_registro || 
          reg.tipo || 
          reg.sentido || 
          ''
        ).toString().toUpperCase();

        let eventoReal = 'ENTRADA';

        if (tipoMovString.includes('SALIDA') || tipoMovString.includes('EGRESO') || tipoMovString.includes('EXIT') || tipoMovString.includes('OUT')) {
          eventoReal = 'SALIDA';
        } else if (tipoMovString.includes('ENTRADA') || tipoMovString.includes('INGRESO') || tipoMovString.includes('ENTRY') || tipoMovString.includes('IN')) {
          eventoReal = 'ENTRADA';
        }

        return {
          fechaHora: fechaHoraFormateada,
          usuario: usuarioReal,
          tipoVehiculo: tipoVehiculoReal,
          placa: placaReal,
          metodoValidacion: metodo,
          evento: eventoReal,
          sincronizado: reg.sincronizado !== undefined ? reg.sincronizado : true
        };
      });

      this.cargandoHistorial = false;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Error cargando historial:', err);
      this.cargandoHistorial = false;
      this.cdr.detectChanges();
    }
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