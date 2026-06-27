import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../servicios/auth'; 
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink], 
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {
  loginForm!: FormGroup;
  loading = false;           
  errorMessage: string | null = null; 
  showPassword = false;              
  biometricActive = false;        
  biometricLabel = 'Iniciar escaneo';  

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
    this.biometricActive = true;
    this.biometricLabel = 'Escaneando rostro...';
    
    setTimeout(() => {
      this.biometricActive = false;
      this.biometricLabel = 'Rostro verificado con éxito';
      console.log('Biometría facial ejecutada.');
    }, 3000);
  }

  onSubmit(): void {
    this.errorMessage = null; 

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched(); 
      return;
    }

    this.loading = true; 

    const datosMapeados = {
      correo: this.loginForm.value.email, 
      password: this.loginForm.value.password
    };

    console.log('Datos mapeados enviados a Django:', datosMapeados);

    this.authService.login(datosMapeados).subscribe({
      next: (response) => {
        this.loading = false;
        console.log('¡Autenticación exitosa!', response);

        localStorage.setItem('access', response.access);
        localStorage.setItem('refresh', response.refresh);
        
        if (response.usuario) {
          localStorage.setItem('usuario', JSON.stringify(response.usuario));
          
          const rol = response.usuario.rol; 
          console.log('Redireccionando según rol:', rol);

          switch (rol) {
            case 'Administrador':
              this.router.navigate(['/dashboardAdministrador']); 
              break;
            case 'seguridad':
              this.router.navigate(['/dashboardVigilante']);
              break;
            case 'aprendiz':
              this.router.navigate(['/dashboardUsuario']);
              break;
            default:
              this.errorMessage = 'Rol no autorizado para acceder al sistema.';
              break;
          }
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Error de autenticación. Verifica tus credenciales.';
        console.error('Error en el login:', err);
      }
    });
  }
}