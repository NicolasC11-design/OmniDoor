import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../servicios/auth/auth';

import { BiometriaCamaraComponent } from '../biometria-camara/biometria-camara';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const pw = control.get('password');
  const cpw = control.get('confirmPassword');

  if (!pw || !cpw || !pw.value || !cpw.value) return null;

  return pw.value !== cpw.value ? { passwordMismatch: true } : null;
}

function placaValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value || value === 'N/A' || String(value).trim() === '') {
    return null;
  }
  const autoRegex = /^[A-Za-z]{3}-?\d{3}$/;
  const motoRegex = /^[A-Za-z]{3}-?\d{2}[A-Za-z]{1}$/;

  const form = control.parent;
  const tipo = form ? form.get('tipoVehiculo')?.value : null;

  if (tipo === 'MOTO' || tipo === 'MOTOCICLETA') {
    if (!motoRegex.test(value)) {
      return { placaInvalid: true, mensaje: 'Formato de moto debe ser ABC12D o ABC-12D' };
    }
  } else {
    if (!autoRegex.test(value)) {
      return { placaInvalid: true, mensaje: 'Formato de auto debe ser ABC123 o ABC-123' };
    }
  }

  return null;
}

export interface VehicleType {
  value: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-registrer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, BiometriaCamaraComponent],
  templateUrl: './registrer.html',
  styleUrls: ['./registrer.css'],
})
export class Register implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  biometricCapturing = false;
  biometricCaptured = false;
  biometricLabel = 'registrar datos biométricos faciales';
  vectorBiometrico: number[] | null = null;
  ocrCapturing = false;
  selectedVehicle = 'auto';
  errorMessage = '';
  successMessage = '';
  registroEnviado = false;
  backendPlacaError: string | null = null;

  vehicleTypes: VehicleType[] = [
    { value: 'auto', label: 'auto', icon: 'ti-car' },
    { value: 'moto', label: 'moto', icon: 'ti-motorbike' },
    { value: 'bici', label: 'bici', icon: 'ti-bike' },
    { value: 'patin', label: 'patín', icon: 'ti-skateboard' },
    { value: 'electr', label: 'eléct.', icon: 'ti-plug' },
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  get f() {
    return this.registerForm.controls;
  }

  ngOnInit(): void {
    const tipoInicial = this.selectedVehicle === 'auto'
      ? 'AUTOMOVIL'
      : (this.selectedVehicle ? this.selectedVehicle.toUpperCase() : 'AUTOMOVIL');

    this.registerForm = this.fb.group({
      nombres: ['', [Validators.required, Validators.minLength(2)]],
      apellidos: ['', [Validators.required, Validators.minLength(2)]],
      correo: ['', [Validators.required, Validators.email]],
      rol: ['', Validators.required],
      ficha: [''],
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
      tipoVehiculo: [tipoInicial]
    }, { validators: passwordMatchValidator });

    this.evaluarRequerimientoPlaca(this.selectedVehicle);
    this.registerForm.get('placa')?.valueChanges.subscribe(() => this.backendPlacaError = null);
    this.registerForm.get('rol')?.valueChanges.subscribe(rolSeleccionado => {
    const fichaControl = this.registerForm.get('ficha');
    if (rolSeleccionado === 'aprendiz' || rolSeleccionado === 'instructor') {
      fichaControl?.setValidators([Validators.required, Validators.pattern(/^\d+$/)]);
    } else {
      fichaControl?.clearValidators();
    }
    fichaControl?.updateValueAndValidity();
  });
  }

  onSubmit(): void {
  this.errorMessage = '';
  this.successMessage = '';

  if (this.registerForm.invalid) {
    this.registerForm.markAllAsTouched();
    this.errorMessage = '⚠️ Por favor revisa los campos en rojo. Hay datos inválidos o incompletos.';
    this.cdr.detectChanges();
    return;
  }

  if (!this.vectorBiometrico || this.vectorBiometrico.length === 0) {
    this.errorMessage = '⚠️ Debes capturar tus datos biométricos faciales antes de solicitar el acceso.';
    alert('Atención: Debes realizar el escaneo facial antes de enviar la solicitud.');
    this.cdr.detectChanges();
    return;
  }

  this.loading = true;
  this.backendPlacaError = null;

  const { confirmPassword, ...data } = this.registerForm.value;
  const payload = {
    ...data,
    vector_biometrico: this.vectorBiometrico
  };

  console.log('Enviando petición POST a Django:', payload);
  this.authService.register(payload).subscribe({
    next: (res) => {
      this.loading = false;
      this.registroEnviado = true;
      this.successMessage =
        'Solicitud recibida. Tu registro está en proceso de verificación y será habilitado cuando el administrador apruebe tu cuenta.';
      this.registerForm.disable();
      this.cdr.detectChanges();

      setTimeout(() => this.router.navigate(['/login']), 8000);
    },
    error: (err) => {
      this.loading = false;
      this.registroEnviado = false;
      console.error('Error del servidor:', err);

      if (err.error && err.error.placa) {
        this.backendPlacaError = Array.isArray(err.error.placa) ? err.error.placa[0] : err.error.placa;
        this.registerForm.get('placa')?.setErrors({ placaDuplicada: true });
        this.errorMessage = this.backendPlacaError || 'La placa ingresada ya se encuentra registrada.';
      } 
      else if (err.error && err.error.correo) {
        this.registerForm.get('correo')?.setErrors({ unique: true });
        this.errorMessage = Array.isArray(err.error.correo) ? err.error.correo[0] : err.error.correo;
      } 
      else {
        this.errorMessage = 'Error en el servidor: ' + (err.error?.detail || err.message || JSON.stringify(err.error));
      }

      this.cdr.detectChanges();
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
      this.cdr.detectChanges();
    }, 1000);
  }

  captureBiometric(): void {
    if (this.registroEnviado) return;
    this.biometricCapturing = true;
    console.log('📷 Iniciando captura biométrica en vivo...');
  }

  onRostroCapturado(vectorReal: any): void {
    if (!vectorReal) {
      console.warn('⚠️ No se detectó un rostro válido.');
      return;
    }

    this.vectorBiometrico = vectorReal; 
    this.biometricCaptured = true;
    this.biometricCapturing = false;
    this.biometricLabel = '✓ Biometría registrada correctamente (Clic para recapturar)';

    console.log('✅ Biometría capturada exitosamente:', this.vectorBiometrico);
  }

  cancelarCapturaBiometrica(): void {
    this.biometricCapturing = false;
  }

  evaluarRequerimientoPlaca(vehicleType: string): void {
    const placaControl = this.registerForm.get('placa');

    if (vehicleType === 'bici' || vehicleType === 'patin' || vehicleType === 'electr') {
      placaControl?.clearValidators();
      this.registerForm.patchValue({ placa: 'N/A' });
    } else {
      placaControl?.setValidators([Validators.required, placaValidator]);
      if (placaControl?.value === 'N/A') {
        this.registerForm.patchValue({ placa: '' });
      }
    }
    placaControl?.updateValueAndValidity();
  }

  selectVehicle(value: string): void {
  this.selectedVehicle = value;
  const tipoParaBackend = value === 'auto' ? 'AUTOMOVIL' : value.toUpperCase();
  this.registerForm.patchValue({ tipoVehiculo: tipoParaBackend });
  this.evaluarRequerimientoPlaca(value);
  this.registerForm.get('placa')?.updateValueAndValidity();
}
}