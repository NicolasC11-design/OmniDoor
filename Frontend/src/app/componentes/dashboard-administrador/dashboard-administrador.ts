import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../servicios/admin';
import { AuthService } from '../../servicios/auth';

type Vista = 'panel' | 'solicitudes' | 'usuarios' | 'reportes';

export interface Conductor {
  id_usuario?: string;
  cedula: string;
  nombre: string;
  correo : string;
  rol: string;
  tipoVehiculo: string;
  placa: string;
  biometriaCapturada: boolean;
}

export interface RegistroHistorial {
  fechaHora: string;
  placa: string;
  conductor: string;
  metodoValidacion: 'biometria' | 'manual' | 'ocr';
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
    tipoMovimiento: 'todos',
  };

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

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
        console.log('Usuarios brutos de Django:', data);
        
        this.conductores = data.map(u => ({
          id_usuario: u.id_usuario || u.id || u.id_conductor || u.idUsuario, 
          
          cedula: u.cedula || 'N/A',
          nombre: (u.nombre_completo || u.nombre || 'Sin Nombre').toUpperCase(),
          correo: u.correo || '',
          rol: u.rol || 'aprendiz',
          tipoVehiculo: u.vehiculos && u.vehiculos.length > 0 ? u.vehiculos[0].tipoVehiculo : 'auto',
          placa: u.vehiculos && u.vehiculos.length > 0 ? u.vehiculos[0].placa : 'N/A',
          biometriaCapturada: u.estado === 'activo'
        }));
        
        console.log('Conductores mapeados con ID:', this.conductores);
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
      nombre: '', rol: 'aprendiz', 
      correo: '' ,
      tipoVehiculo: 'auto', 
      placa: '', 
      biometriaCapturada: false };
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
      const payload = {
        nombre_completo: this.formConductor.nombre.trim(),
        rol: this.formConductor.rol,
        correo: this.formConductor.correo
      };

      this.authService.actualizarUsuarioAdmin(this.conductorEnEdicion.id_usuario, payload).subscribe({
        next: () => {
          alert('¡Usuario actualizado en la base de datos con éxito!');
          this.cerrarModalConductor();
          this.cargarConductores();
        },
        error: (err) => {
          console.error('Error detallado de Django:', err);
          const msgError = err.error ? JSON.stringify(err.error) : 'Revisa las validaciones.';
          alert('Error del servidor: ' + msgError);
          this.cargandoSolicitudes = false;
          this.cdr.detectChanges();
        }
      });
    }
  }
  

  eliminarConductor(c: Conductor): void {
  console.log('Conductor a eliminar:', c);

  if (!c.id_usuario) {
    alert(`Error: El usuario ${c.nombre} no tiene un ID de base de datos asignado en el Frontend.`);
    return;
  }

  if (confirm(`¿Estás seguro de eliminar permanentemente a ${c.nombre} de la base de datos?`)) {
    this.cargandoSolicitudes = true;

    this.authService.eliminarUsuarioAdmin(c.id_usuario).subscribe({
      next: () => {
        alert('Usuario eliminado correctamente de Supabase.');
        this.cargarConductores();
        this.cargarKpis();
      },
      error: (err) => {
        console.error('Error al eliminar:', err);
        alert(err.error?.error || 'Hubo un error en el servidor al intentar eliminar el registro.');
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
        this.historial = data.map(reg => {
          const conductorReal = reg.vehiculo?.propietario?.nombre_completo 
                            || reg.nombre_conductor_manual 
                            || 'CONSTRUCTOR / VISITANTE';
          const placaReal = reg.vehiculo?.placa 
                        || reg.placa_manual 
                        || 'N/A';

          let fechaHoraFormateada = 'Fecha Desconocida';
          if (reg.fecha_hora) {
            const dateObj = new Date(reg.fecha_hora);
            fechaHoraFormateada = `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          }
          const metodo = reg.vehiculo ? 'Automático' : 'Manual';

          return {
            fechaHora: fechaHoraFormateada,
            placa: placaReal,
            conductor: conductorReal,
            metodoValidacion: reg.tipo_movimiento || metodo,
            sincronizado: true
          };
        });

        this.cargandoHistorial = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando historial de la base de datos:', err);
        alert('Hubo un problema de sincronización con Supabase.');
        this.cargandoHistorial = false;
        this.cdr.detectChanges();
      }
    });
  }

  exportar(formato: 'pdf' | 'excel'): void {
    console.log('Exportando historial en formato', formato, this.filtros);
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}