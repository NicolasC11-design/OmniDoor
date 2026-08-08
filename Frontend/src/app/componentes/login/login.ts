import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../servicios/auth/auth'; 
import { Router, RouterLink } from '@angular/router';
import { BiometriaCamaraComponent } from '../biometria-camara/biometria-camara';

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

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/)
      ]]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  activateBiometric(): void {
    this.mostrarCamara = true;
    this.biometricLabel = 'ESCANEO EN PROCESO...';
  }
  
  onBiometriaCapturada(vector: number[]): void {
    this.vectorBiometrico = vector;
    this.mostrarCamara = false;
    this.biometricLabel = '✓ ROSTRO CAPTURADO Y LISTO';
    console.log('Embedding facial listo. Ejecutando acceso rápido biométrico...');
    this.onSubmit();
  }

  onSubmit(): void {
    this.errorMessage = null; 
    if (this.vectorBiometrico) {
      this.loading = true;
      const payloadBiometrico = {
        vector_biometrico: this.vectorBiometrico
      };

      console.log('Enviando biometría rápida a Django:', payloadBiometrico);

      this.authService.login(payloadBiometrico).subscribe({
        next: (response) => this.procesarRespuestaExitosa(response),
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.error || 'Rostro no reconocido o cuenta inactiva.';
          console.error('Error en el login biométrico:', err);
        }
      });
      return;
    }

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched(); 
      return;
    }

    this.loading = true; 

    const datosMapeados = {
      correo: this.loginForm.value.email, 
      password: this.loginForm.value.password
    };

    console.log('Datos credenciales enviados a Django:', datosMapeados);

    this.authService.login(datosMapeados).subscribe({
      next: (response) => this.procesarRespuestaExitosa(response),
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Error de autenticación. Verifica tus credenciales.';
        console.error('Error en el login:', err);
      }
    });
  }

  private procesarRespuestaExitosa(response: any): void {
    this.loading = false;
    console.log('¡Autenticación exitosa!', response);

    localStorage.setItem('access', response.access);
    localStorage.setItem('refresh', response.refresh);
    
    if (response.usuario) {
      localStorage.setItem('usuario', JSON.stringify(response.usuario));
      
      const rol = response.usuario.rol; 
      console.log('Redireccionando según rol:', rol);

      switch (rol) {
        case 'administrador':
        case 'admin':
          this.router.navigate(['/dashboardAdministrador']); 
          break;
        case 'seguridad':
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
}