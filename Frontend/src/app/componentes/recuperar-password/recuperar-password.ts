import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../servicios/auth/auth';
import { BiometriaCamaraComponent } from '../biometria-camara/biometria-camara';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, BiometriaCamaraComponent],
  templateUrl: './recuperar-password.html',
  styleUrls: ['./recuperar-password.css']
})
export class RecuperarPasswordComponent implements OnInit {
  recuperarForm!: FormGroup;
  metodo: 'biometria' | 'datos' | null = null;
  loading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  mostrarCamara = false;
  vectorBiometrico: number[] | null = null;
  biometricLabel = 'INICIAR ESCANEO FACIAL';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.recuperarForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      ficha: [''],
      telefono: [''],
      nueva_password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  get f() { return this.recuperarForm.controls; }

  seleccionarMetodo(metodo: 'biometria' | 'datos'): void {
    this.metodo = metodo;
    this.errorMessage = null;
    this.successMessage = null;
    if (metodo === 'biometria') {
      this.mostrarCamara = true;
      this.biometricLabel = 'ESCANEO EN PROCESO...';
      this.recuperarForm.get('ficha')?.clearValidators();
      this.recuperarForm.get('telefono')?.clearValidators();
    } else {
      this.mostrarCamara = false;
      this.vectorBiometrico = null;
      this.recuperarForm.get('ficha')?.setValidators([Validators.required]);
      this.recuperarForm.get('telefono')?.setValidators([Validators.required]);
    }
    this.recuperarForm.get('ficha')?.updateValueAndValidity();
    this.recuperarForm.get('telefono')?.updateValueAndValidity();
  }

  onBiometriaCapturada(vector: number[]): void {
    this.vectorBiometrico = vector;
    this.mostrarCamara = false;
    this.biometricLabel = '✓ ROSTRO CAPTURADO';
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.recuperarForm.invalid) {
      this.recuperarForm.markAllAsTouched();
      return;
    }

    if (this.metodo === 'biometria' && !this.vectorBiometrico) {
      this.errorMessage = 'Debe escanear su rostro para continuar con este método.';
      return;
    }

    this.loading = true;

    const payload: any = {
      correo: this.recuperarForm.value.correo,
      nueva_password: this.recuperarForm.value.nueva_password,
      metodo: this.metodo
    };

    if (this.metodo === 'biometria') {
      payload.vector_biometrico = this.vectorBiometrico;
    } else {
      payload.ficha = this.recuperarForm.value.ficha;
      payload.telefono = this.recuperarForm.value.telefono;
    }

    this.authService.restablecerPasswordSeguro(payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.successMessage = res.mensaje || 'Contraseña restablecida correctamente.';
        this.metodo = null;
        this.recuperarForm.reset();
        this.vectorBiometrico = null;
        this.cdr.detectChanges();
        
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err: any) => {
        this.loading = false;
        if (err.error?.error) {
          this.errorMessage = err.error.error;
        } else if (err.status === 0) {
          this.errorMessage = 'Error de red. Verifica tu conexión.';
        } else {
          this.errorMessage = 'No se pudo restablecer la contraseña. Verifica tus datos.';
        }
        this.cdr.detectChanges();
      }
    });
  }
}
