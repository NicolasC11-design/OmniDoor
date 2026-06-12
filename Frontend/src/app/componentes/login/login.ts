import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login implements OnInit {
  loginForm!: FormGroup;

  loading       = false;
  showPassword  = false;
  biometricActive = false;
  biometricLabel  = 'toque para activar biometría facial';
  errorMessage    = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    //private authService: AuthService  
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
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
    this.biometricLabel  = 'escaneando...';
    setTimeout(() => {
      this.biometricActive = false;
      this.biometricLabel  = 'toque para activar biometría facial';
    }, 2000);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading      = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    setTimeout(() => {
      this.loading = false;
      if (email === 'admin@sena.edu.co' && password === 'admin123') {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = 'credenciales incorrectas — verifique sus datos';
      }
    }, 1500);
  }
}