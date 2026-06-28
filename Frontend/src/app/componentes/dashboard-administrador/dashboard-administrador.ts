import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../servicios/auth';

type Vista = 'panel' | 'solicitudes' | 'usuarios' | 'reportes';

export interface Conductor {
  cedula: string;
  nombre: string;
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
    this.kpis = {
      vehiculosRegistrados: 0,
      ingresosHoy: 0,
      accesosDenegados: 0,
    };
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
    this.conductores = [];
  }

  private conductorVacio(): Conductor {
    return { cedula: '', nombre: '', rol: 'aprendiz', tipoVehiculo: 'auto', placa: '', biometriaCapturada: false };
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
  }

  cerrarModalConductor(): void {
    this.mostrarModalConductor = false;
  }

  capturarBiometria(): void {
    this.formConductor.biometriaCapturada = true;
  }

  guardarConductor(): void {
    if (!this.formConductor.cedula.trim() || !this.formConductor.nombre.trim() || !this.formConductor.placa.trim()) {
      return;
    }
    if (this.conductorEnEdicion) {
      const idx = this.conductores.indexOf(this.conductorEnEdicion);
      if (idx > -1) this.conductores[idx] = { ...this.formConductor };
    } else {
      this.conductores.unshift({ ...this.formConductor, rol: 'aprendiz' });
    }
    this.cerrarModalConductor();
  }

  eliminarConductor(c: Conductor): void {
    this.conductores = this.conductores.filter(x => x !== c);
  }

  private cargarHistorial(): void {

    this.historial = [];
  }

  exportar(formato: 'pdf' | 'excel'): void {
    console.log('Exportando historial en formato', formato, this.filtros);
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}