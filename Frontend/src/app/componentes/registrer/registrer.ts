import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const pw  = control.get('password');
  const cpw = control.get('confirmPassword');
  if (pw && cpw && pw.value !== cpw.value) {
    return { passwordMismatch: true };
  }
  return null;
}


function placaValidator(control: AbstractControl): ValidationErrors | null {
  const regex = /^[A-Za-z]{3}-?\d{3}$/;
  if (control.value && !regex.test(control.value)) {
    return { placaInvalid: true };
  }
  return null;
}

export interface VehicleType {
  value: string;
  label: string;
  icon:  string;
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

  loading             = false;
  biometricCapturing  = false;
  biometricCaptured   = false;
  biometricLabel      = 'registrar datos biométricos faciales';
  ocrCapturing        = false;
  selectedVehicle     = 'auto';
  errorMessage        = '';
  successMessage      = '';

  vehicleTypes: VehicleType[] = [
    { value: 'auto',   label: 'auto',   icon: 'ti-car'        },
    { value: 'moto',   label: 'moto',   icon: 'ti-motorbike'  },
    { value: 'bici',   label: 'bici',   icon: 'ti-bike'       },
    { value: 'patin',  label: 'patín',  icon: 'ti-skateboard' },
    { value: 'electr', label: 'eléct.', icon: 'ti-plug'       },
  ];

  constructor(
    private fb:     FormBuilder,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group(
      {
        nombres:         ['', [Validators.required, Validators.minLength(2)]],
        apellidos:       ['', [Validators.required, Validators.minLength(2)]],
        email:           ['', [Validators.required, Validators.email]],
        rol:             ['', Validators.required],
        placa:           ['', [Validators.required, placaValidator]],
        password:        ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordMatchValidator }
    );
  }


  get f() {
    return this.registerForm.controls;
  }

  selectVehicle(value: string): void {
    this.selectedVehicle = value;
  }

 
  captureOCR(): void {
    this.ocrCapturing = true;


    setTimeout(() => {
      this.registerForm.patchValue({ placa: 'ABC-123' });
      this.ocrCapturing = false;
    }, 1500);
  }


  captureBiometric(): void {
    if (this.biometricCaptured) return;

    this.biometricCapturing = true;
    this.biometricLabel     = '[ capturando rostro... ]';

    setTimeout(() => {
      this.biometricCapturing = false;
      this.biometricCaptured  = true;
      this.biometricLabel     = '✓ biometría capturada';
    }, 2000);
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading       = true;
    this.errorMessage  = '';
    this.successMessage = '';

    const payload = {
      ...this.registerForm.value,
      tipoVehiculo: this.selectedVehicle,
    };

    console.log('Payload de registro:', payload);
    setTimeout(() => {
      this.loading        = false;
      this.successMessage = 'solicitud enviada — pendiente de aprobación por administrador';
      setTimeout(() => this.router.navigate(['/login']), 2500);
    }, 1500);
  }
}