import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const pw = control.get('password');
  const cpw = control.get('confirmPassword');
  
  if (!pw || !cpw || !pw.value || !cpw.value) return null;
  
  return pw.value !== cpw.value ? { passwordMismatch: true } : null;
}

function placaValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value || control.value === 'N/A' || control.value.trim() === '') {
    return null;
  }
  const autoRegex = /^[A-Za-z]{3}-\d{3}$/;
  const motoRegex = /^[A-Za-z]{3}-\d{2}[A-Za-z]{1}$/;
  
  if (autoRegex.test(control.value) || motoRegex.test(control.value)) {
    return null;
  }
  return { placaInvalid: true };
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
      telefono: ['', [Validators.required, Validators.pattern(/^\d+$/)]], 
      direccion: ['', Validators.required], 
      nombre_emergencia: ['', Validators.required], 
      contacto_emergencia: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      password: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/)
      ]],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordMatchValidator });
  }

  selectVehicle(value: string): void {
    if (this.registroEnviado) return;
    this.selectedVehicle = value;

    const placaControl = this.registerForm.get('placa');

    if (value === 'bici' || value === 'patin' || value === 'electr') {
      placaControl?.setValue('N/A');
      placaControl?.clearValidators();
    } else {
      if (placaControl?.value === 'N/A') {
        placaControl?.setValue('');
      }
      placaControl?.setValidators([Validators.required, placaValidator]);
    }
    placaControl?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      console.error('El formulario tiene errores en los siguientes campos:');
      Object.keys(this.registerForm.controls).forEach(key => {
        const controlErrors = this.registerForm.get(key)?.errors;
        if (controlErrors != null) {
          console.error(`-> Campo [${key}]:`, controlErrors);
        }
      });
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { confirmPassword, ...data } = this.registerForm.value;
    const payload = { ...data, tipoVehiculo: this.selectedVehicle };

    console.log('Enviando petición POST a Django:', payload);

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

  captureOCR(): void {
    if (this.registroEnviado) return;
    if (this.selectedVehicle === 'bici' || this.selectedVehicle === 'patin' || this.selectedVehicle === 'electr') return;
    
    this.ocrCapturing = true;
    setTimeout(() => {
      const placaSimulada = this.selectedVehicle === 'moto' ? 'ABC-12D' : 'ABC-123';
      this.registerForm.patchValue({ placa: placaSimulada });
      this.registerForm.get('placa')?.markAsTouched();
      this.registerForm.get('placa')?.markAsDirty();
      this.registerForm.get('placa')?.updateValueAndValidity();
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