import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

// Validadores personalizados
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const pw = control.get('password');
  const cpw = control.get('confirmPassword');
  return (pw && cpw && pw.value !== cpw.value) ? { passwordMismatch: true } : null;
}

function placaValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value || control.value === 'N/A' || control.value === 'SIN PLACA') return null;
  const valor = control.value.toString().trim().toUpperCase();
  const autoRegex = /^[A-Z]{3}-?\d{3}$/;
  const motoRegex = /^[A-Z]{3}-?\d{2}[A-Z]$/;
  
  if (autoRegex.test(valor) || motoRegex.test(valor)) {
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
      correo: ['', [Validators.required, Validators.email]], // Corregido: de 'email' a 'correo'
      rol: ['', Validators.required],
      
      // ── NUEVOS CAMPOS ADAPTADOS DE CONTACTO E INSTITUCIONALES ──
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      direccion: ['', Validators.required],
      nombre_emergencia: ['', Validators.required],
      telefono_emergencia: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      
      // campos vehiculares base
      placa: ['', [Validators.required, placaValidator]],
      marca: ['', Validators.required],
      modelo: ['', Validators.required],
      
      password: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/)
      ]],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordMatchValidator });

    this.selectVehicle('auto');
  }

  selectVehicle(value: string): void {
    this.selectedVehicle = value;

    const placaControl = this.registerForm.get('placa');
    const marcaControl = this.registerForm.get('marca');
    const modeloControl = this.registerForm.get('modelo');

    if (value === 'bici' || value === 'patin' || value === 'electr') {
      placaControl?.setValue('N/A');
      marcaControl?.setValue('N/A');
      modeloControl?.setValue('N/A');

      placaControl?.clearValidators();
      marcaControl?.clearValidators();
      modeloControl?.clearValidators();
    } else {
      if (placaControl?.value === 'N/A') { placaControl?.setValue(''); }
      if (marcaControl?.value === 'N/A') { marcaControl?.setValue(''); }
      if (modeloControl?.value === 'N/A') { modeloControl?.setValue(''); }

      placaControl?.setValidators([Validators.required, placaValidator]);
      marcaControl?.setValidators([Validators.required]);
      modeloControl?.setValidators([Validators.required]);
    }

    placaControl?.updateValueAndValidity();
    marcaControl?.updateValueAndValidity();
    modeloControl?.updateValueAndValidity();
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
  
    if (this.selectedVehicle === 'bici' || this.selectedVehicle === 'patin' || this.selectedVehicle === 'electr') {
      data.placa = 'SIN PLACA';
      data.marca = 'GENERICA';
      data.modelo = 'GENERICO';
    } else {
      data.placa = data.placa.toUpperCase().trim();
    }

    const payload = { ...data, tipoVehiculo: this.selectedVehicle };

    console.log('Enviando a Django:', payload);

    this.http.post('http://localhost:8000/api/auth/register/', payload).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMessage = 'Registro enviado con éxito.';
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.loading = false;

        this.errorMessage = 'Error: ' + (err.error?.detail || JSON.stringify(err.error));
        console.error('Error del servidor:', err);
      }
    });
  }


  captureOCR(): void {
    this.ocrCapturing = true;
    setTimeout(() => {
      this.registerForm.patchValue({ placa: 'ABC-123' });
      this.ocrCapturing = false;
    }, 1000);
  }

  captureBiometric(): void {
    if (this.biometricCaptured) return;
    this.biometricCapturing = true;
    this.biometricLabel = '[ capturando rostro... ]';
    setTimeout(() => {
      this.biometricCapturing = false;
      this.biometricCaptured = true;
      this.biometricLabel = '✓ biometría capturada';
    }, 2000);
  }
}