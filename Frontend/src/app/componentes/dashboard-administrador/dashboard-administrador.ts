import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../servicios/auth'; 

@Component({
  selector: 'app-dashboard-administrador',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-administrador.html',
  styleUrls: ['./dashboard-administrador.css']
})
export class AdminDashboard implements OnInit {
  usuariosPendientes: any[] = [];
  loading = false;
  mensajeExito: string | null = null;

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.loading = true;
    this.authService.getUsuariosPendientes().subscribe({
      next: (data: any) => {
        console.log('1. Datos puros recibidos del backend:', data);

        if (Array.isArray(data)) {
          this.usuariosPendientes = data;
        } else if (data && Array.isArray(data.usuarios)) {
          this.usuariosPendientes = data.usuarios;
        } else {
          this.usuariosPendientes = [];
        }

        console.log('2. Variable usuariosPendientes asignada:', this.usuariosPendientes);
        this.loading = false;
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        console.error('Error al cargar usuarios pendientes:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  aceptarCuenta(idUsuario: string): void {
    this.authService.aprobarUsuario(idUsuario).subscribe({
      next: (res: any) => {
        console.log('Respuesta de aprobación de Django:', res);
        
        this.mensajeExito = res.message || res.mensaje || 'Usuario aprobado con éxito';
        
        this.usuariosPendientes = this.usuariosPendientes.filter(u => u.id_usuario !== idUsuario);
        
        this.cdr.detectChanges();
        setTimeout(() => {
          this.mensajeExito = null;
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        console.error('Error al aprobar el usuario:', err);
      }
    });
  }
}