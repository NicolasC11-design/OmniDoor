import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../servicios/auth'; 
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], 
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

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.loading = false;
        console.log('¡Autenticación exitosa!', response);
        this.router.navigate(['/dashboard']); 
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.detail || 'Error de autenticación. Verifica tus credenciales.';
        console.error('Error en el login:', err);
      }
    });
  }
}