import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService, AuthResponse } from '../../servicios/auth/auth';
import { Router, RouterLink } from '@angular/router';
import { BiometriaCamaraComponent } from '../biometria-camara/biometria-camara';

export interface UsuarioCoincidencia {
  id_usuario?: number | string;
  id?: number | string;
  correo: string;
  nombre?: string;
  nombre_completo?: string;
  rol?: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, BiometriaCamaraComponent],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  errorMessage: string | null = null;
  showPassword = false;

  mostrarCamara = false;
  vectorBiometrico: number[] | null = null;
  biometricLabel = 'INICIAR ESCANEO';
  coincidencias: UsuarioCoincidencia[] = [];
  usuarioSeleccionado: UsuarioCoincidencia | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  activateBiometric(): void {
    this.errorMessage = null;
    this.coincidencias = [];
    this.usuarioSeleccionado = null;
    this.mostrarCamara = true;
    this.biometricLabel = 'ESCANEO EN PROCESO...';
  }

  onBiometriaCapturada(vector: number[]): void {
    this.vectorBiometrico = vector;
    this.mostrarCamara = false;
    this.biometricLabel = '✓ ROSTRO CAPTURADO';
    this.onSubmit();
  }

  seleccionarCuenta(usuario: UsuarioCoincidencia): void {
    this.usuarioSeleccionado = usuario;
    this.loginForm.patchValue({ email: usuario.correo });
    this.errorMessage = null;
  }

  onSubmit(): void {
    this.errorMessage = null;
    if (this.vectorBiometrico) {
      this.loading = true;
      const payloadBiometrico = { vector_biometrico: this.vectorBiometrico };

      this.authService.login(payloadBiometrico).subscribe({
        next: (response: AuthResponse) => {
          const listaCuentas = response.cuentas || (response as any).coincidencias;
          
          if (response.multiple_matches || (listaCuentas && listaCuentas.length > 1)) {
            this.loading = false;
            this.coincidencias = listaCuentas || [];
            this.vectorBiometrico = null; 
            this.errorMessage = 'Se encontraron múltiples coincidencias biométricas. Por favor selecciona tu cuenta e ingresa tu contraseña.';
            this.cdr.detectChanges();
            return;
          }
          this.procesarRespuestaExitosa(response);
        },
        error: (err: any) => {
          this.loading = false;
          const listaCuentas = err.error?.cuentas || err.error?.coincidencias;

          if ((err.status === 300 || listaCuentas) && listaCuentas?.length > 0) {
            this.coincidencias = listaCuentas;
            this.vectorBiometrico = null;
            this.errorMessage = err.error?.mensaje || err.error?.error || 'Se encontraron múltiples coincidencias. Selecciona tu cuenta e ingresa tu contraseña.';
          } else {
            this.vectorBiometrico = null;
            this.biometricLabel = 'REINTENTAR ESCANEO';
            this.errorMessage = err.error?.mensaje || err.error?.error || err.error?.detail || 'Rostro no reconocido o cuenta inactiva.';
          }
          this.cdr.detectChanges();
        }
      });
      return;
    }
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const idCuenta = this.usuarioSeleccionado?.id_usuario || this.usuarioSeleccionado?.id;
    
    const datosMapeados: any = {
      correo: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    if (idCuenta) {
      datosMapeados.id_usuario = idCuenta;
    }

    this.authService.login(datosMapeados).subscribe({
      next: (response: AuthResponse) => this.procesarRespuestaExitosa(response),
      error: (err: any) => {
        this.loading = false;

        if (err.error?.error) {
          this.errorMessage = err.error.error;
        } else if (err.error?.detail) {
          this.errorMessage = err.error.detail;
        } else if (err.error?.mensaje) {
          this.errorMessage = err.error.mensaje;
        } else if (err.error && typeof err.error === 'object') {
          const primerCampo = Object.keys(err.error)[0];
          const msg = Array.isArray(err.error[primerCampo]) ? err.error[primerCampo][0] : err.error[primerCampo];
          this.errorMessage = `${primerCampo.toUpperCase()}: ${msg}`;
        } else {
          this.errorMessage = 'Error de autenticación. Verifica tus credenciales.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  private procesarRespuestaExitosa(response: any): void {
    this.loading = false;

    const usuario = response.usuario || this.authService.getUsuarioActual();
    const rol = usuario?.rol?.toLowerCase();

    switch (rol) {
      case 'administrador':
      case 'admin':
        this.router.navigate(['/dashboardAdministrador']);
        break;
      case 'seguridad':
      case 'vigilante':
        const now = new Date();
        const offsetMs = now.getTimezoneOffset() * 60000;
        const localISO = new Date(now.getTime() - offsetMs).toISOString().slice(0, -1);
        localStorage.setItem('horaInicioTurno', localISO);
        this.router.navigate(['/dashboardVigilante']);
        break;
      case 'aprendiz':
      case 'usuario':
        this.router.navigate(['/dashboardUsuario']);
        break;
      default:
        this.errorMessage = 'Rol no autorizado para acceder al sistema.';
        break;
    }
  }
}