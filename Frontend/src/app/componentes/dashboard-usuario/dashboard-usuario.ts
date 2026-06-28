import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../servicios/auth';
import { UsuarioService } from '../../servicios/usuarios';

export interface MiVehiculo {
  id_vehiculo?: string;
  tipoVehiculo: string;
  placa: string;
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
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard-usuario.html',
  styleUrl: './dashboard-usuario.css',
})
export class DashboardUsuario implements OnInit {
  usuario: any = {};
  vehiculo: MiVehiculo | null = null;
  vehiculosActivos: MiVehiculo[] = [];
  miHistorial: RegistroMioHistorial[] = [];
  mensajeExito: string | null = null;
  cargando = false;

  mostrarModalVehiculo = false;
  mostrarModalDatos = false;
  mostrarModalPassword = false;

  formVehiculo!: FormGroup;
  formDatos!: FormGroup;
  formPassword!: FormGroup;

  private iconosVehiculo: Record<string, string> = {
    auto: 'ti-car',
    moto: 'ti-motorbike',
    bici: 'ti-bike',
    patin: 'ti-skateboard',
    electr: 'ti-plug',
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private usuarioService: UsuarioService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {
    this.crearFormularios();
  }

  ngOnInit(): void {
    this.cargarUsuarioLocal();
    if (this.authService.isAuthenticated()) {
      this.cargarDatosServidor();
    } else {
      this.router.navigate(['/login']);
    }
  }

  private crearFormularios(): void {
    this.formVehiculo = this.fb.group({
      tipoVehiculo: ['auto', Validators.required],
      placa: [''],
      marca: ['', Validators.required],
      modelo: ['', Validators.required]
    });
    this.formVehiculo.get('tipoVehiculo')?.valueChanges.subscribe((tipo) => {
      const placaControl = this.formVehiculo.get('placa');
      const marcaControl = this.formVehiculo.get('marca');
      const modeloControl = this.formVehiculo.get('modelo');

      if (tipo === 'moto') {
        placaControl?.setValidators([Validators.required, Validators.pattern(/^[A-Z]{3}-?\d{2}[A-Z]$/i)]);
        marcaControl?.setValidators([Validators.required]);
        modeloControl?.setValidators([Validators.required]);
      } else if (tipo === 'auto') {
        placaControl?.setValidators([Validators.required, Validators.pattern(/^[A-Z]{3}-?\d{3}$/i)]);
        marcaControl?.setValidators([Validators.required]);
        modeloControl?.setValidators([Validators.required]);
      } else {
        placaControl?.clearValidators();
        marcaControl?.clearValidators();
        modeloControl?.clearValidators();
      }
      placaControl?.updateValueAndValidity();
      marcaControl?.updateValueAndValidity();
      modeloControl?.updateValueAndValidity();
    });

    this.formDatos = this.fb.group({
      nombre_completo: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      telefono: [''],
      contacto_emergencia: [''],
      direccion: ['']
    });

    this.formPassword = this.fb.group({
      actual: ['', Validators.required],
      nueva: ['', [Validators.required, Validators.minLength(8)]],
      confirmar: ['', Validators.required]
    });
  }

  private cargarUsuarioLocal(): void {
    const raw = localStorage.getItem('usuario');
    this.usuario = raw ? JSON.parse(raw) : {};
    
    this.formDatos.patchValue({
      nombre_completo: this.usuario.nombre_completo || '',
      correo: this.usuario.correo || ''
    });
  }

  cargarDatosServidor(): void {
    this.usuarioService.getPerfil().subscribe({
      next: (data: any) => {
        this.usuario = data;
        this.formDatos.patchValue({
          nombre_completo: data.nombre_completo,
          correo: data.correo,
          telefono: data.telefono || '',
          contacto_emergencia: data.contacto_emergencia || '',
          direccion: data.direccion || ''
        });
      },
      error: (err: any) => console.error('Error al traer perfil', err)
    });

    this.usuarioService.obtenerTodosLosVehiculos().subscribe({
  next: (response: any) => {
    if (Array.isArray(response)) {
      this.vehiculosActivos = [...response];
    } else if (response && response.data && Array.isArray(response.data)) {
      this.vehiculosActivos = [...response.data];
    } else {
      this.vehiculosActivos = [];
    }
    
    this.cdr.detectChanges(); 
  },
  error: (err: any) => console.error('Error al traer inventario global de vehículos', err)
});

    this.usuarioService.obtenerHistorial().subscribe({
      next: (historial: any) => this.miHistorial = historial,
      error: (err: any) => console.error('Error al traer historial', err)
    });
  }

  obtenerIconoPorTipo(tipo: string): string {
    if (!tipo) return 'ti-car';

    switch (tipo.toLowerCase()) {
      case 'auto':
        return 'ti-car';
      case 'moto':
        return 'ti-motorbike';
      case 'bici':
        return 'ti-bike';
      case 'patin':
        return 'ti-scooter';
      case 'electr':
        return 'ti-bolt';
      default:
        return 'ti-car';
    }
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

  obtenerPlaceholderPlaca(): string {
    const tipo = this.formVehiculo.get('tipoVehiculo')?.value;
    if (tipo === 'moto') return 'ABC-12A';
    return 'ABC-123';
  }

  abrirModalVehiculo(): void {
    if (this.vehiculo) {
      this.formVehiculo.patchValue({
        tipoVehiculo: this.vehiculo.tipoVehiculo,
        placa: this.vehiculo.placa,
        marca: this.vehiculo.marca || '',
        modelo: this.vehiculo.modelo || ''
      });
    } else {
      this.formVehiculo.reset({ tipoVehiculo: 'auto', placa: '', marca: '', modelo: '' });
    }
    this.mostrarModalVehiculo = true;
  }

  abrirModalDatos(): void { this.mostrarModalDatos = true; }
  abrirModalPassword(): void { this.formPassword.reset(); this.mostrarModalPassword = true; }
  cerrarModales(): void { this.mostrarModalVehiculo = false; this.mostrarModalDatos = false; this.mostrarModalPassword = false; }

  guardarVehiculo(): void {
    if (this.formVehiculo.invalid) {
      if (this.formVehiculo.get('tipoVehiculo')?.value === 'moto') {
        alert('Por favor, ingresa una placa de moto válida con letra al final (ej: ABC12A o ABC-12A).');
      } else {
        alert('Por favor, ingresa los datos completos (Marca, Modelo y Placa si aplica).');
      }
      return;
    }

    const datosVehiculo = { ...this.formVehiculo.value };
    const tipo = datosVehiculo.tipoVehiculo;

    if (tipo === 'bici' || tipo === 'patin' || tipo === 'electr') {
      datosVehiculo.placa = 'SIN PLACA'; 
      datosVehiculo.marca = 'GENERICA';
      datosVehiculo.modelo = 'GENERICO';
    } else {
      datosVehiculo.placa = datosVehiculo.placa.toUpperCase().trim();
    }

    this.cargando = true;
    this.usuarioService.agregarVehiculo(datosVehiculo).subscribe({
      next: () => {
        this.mostrarExito('Vehículo guardado correctamente');
        this.cargando = false;
        this.cargarDatosServidor();
        this.cerrarModales();
      },
      error: () => { 
        this.cargando = false; 
        alert('Error al guardar el vehículo. Verifica el formato en la base de datos.'); 
      }
    });
  }

  guardarDatos(): void {
    if (this.formDatos.invalid) return;
    this.usuarioService.updateMiPerfil(this.formDatos.value).subscribe({
      next: (data: any) => {
        this.usuario = { ...this.usuario, ...data };
        localStorage.setItem('usuario', JSON.stringify(this.usuario));
        this.mostrarExito('Datos actualizados correctamente');
        this.cargarDatosServidor();
        this.cerrarModales();
      },
      error: () => alert('Error al guardar datos personales')
    });
  }

  guardarPassword(): void {
    const { actual, nueva, confirmar } = this.formPassword.value;
    if (!actual || !nueva || nueva !== confirmar) {
      alert('Las contraseñas no coinciden.');
      return;
    }
    
    const payload = { old_password: actual, new_password: nueva };
    this.usuarioService.cambiarPassword(payload).subscribe({
      next: () => {
        this.mostrarExito('Contraseña actualizada correctamente');
        this.cerrarModales();
      },
      error: () => alert('Error al cambiar contraseña.')
    });
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private mostrarExito(msg: string): void {
    this.mensajeExito = msg;
    setTimeout(() => { this.mensajeExito = null; }, 3000);
  }
}