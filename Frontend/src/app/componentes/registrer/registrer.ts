import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';


function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const pw = control.get('password');
  const cpw = control.get('confirmPassword');
  return (pw && cpw && pw.value !== cpw.value) ? { passwordMismatch: true } : null;
}

function placaValidator(control: AbstractControl): ValidationErrors | null {
  const regex = /^[A-Za-z]{3}-?\d{3}$/;
  return (control.value && !regex.test(control.value)) ? { placaInvalid: true } : null;
}

export interface VehicleType {
  value: string; label: string; icon: string;
}

@Component({
  selector: 'app-registrer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './registrer.html',
  styleUrls: ['./registrer.css'],
})
export class Register implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  biometricCapturing = false;
  biometricCaptured = false;
  biometricLabel = 'registrar datos biométricos faciales';
  ocrCapturing = false;
  selectedVehicle = 'auto';
  errorMessage = '';
  successMessage = '';


  registroEnviado = false;

  vehicleTypes: VehicleType[] = [
    { value: 'auto', label: 'auto', icon: 'ti-car' },
    { value: 'moto', label: 'moto', icon: 'ti-motorbike' },
    { value: 'bici', label: 'bici', icon: 'ti-bike' },
    { value: 'patin', label: 'patín', icon: 'ti-skateboard' },
    { value: 'electr', label: 'eléct.', icon: 'ti-plug' },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient
  ) {}

  get f() {
    return this.registerForm.controls;
  }

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      nombres: ['', [Validators.required, Validators.minLength(2)]],
      apellidos: ['', [Validators.required, Validators.minLength(2)]],
      correo: ['', [Validators.required, Validators.email]],
      rol: ['', Validators.required],
      placa: ['', [Validators.required, placaValidator]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordMatchValidator });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { confirmPassword, ...data } = this.registerForm.value;
    const payload = { ...data, tipoVehiculo: this.selectedVehicle };

    console.log('Enviando a Django:', payload);

    this.http.post('http://localhost:8000/api/auth/register/', payload).subscribe({
      next: (res) => {
        this.loading = false;
        this.registroEnviado = true;
        this.successMessage =
          'Solicitud recibida. Tu registro está en proceso de verificación y será habilitado cuando el administrador apruebe tu cuenta.';
        this.registerForm.disable();
        setTimeout(() => this.router.navigate(['/login']), 8000);
      },
      error: (err) => {
        this.loading = false;
        this.registroEnviado = false;
        this.errorMessage = 'Error: ' + (err.error?.detail || JSON.stringify(err.error));
        console.error('Error del servidor:', err);
      }
    });
  }

  selectVehicle(value: string): void {
    if (this.registroEnviado) return;
    this.selectedVehicle = value;
  }

  captureOCR(): void {
    if (this.registroEnviado) return;
    this.ocrCapturing = true;
    setTimeout(() => {
      this.registerForm.patchValue({ placa: 'ABC-123' });
      this.ocrCapturing = false;
    }, 1000);
  }

  captureBiometric(): void {
    if (this.biometricCaptured || this.registroEnviado) return;
    this.biometricCapturing = true;
    this.biometricLabel = '[ capturando rostro... ]';
    setTimeout(() => {
      this.biometricCapturing = false;
      this.biometricCaptured = true;
      this.biometricLabel = '✓ biometría capturada';
    }, 2000);
  }
}