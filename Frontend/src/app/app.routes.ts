import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./componentes/login/login').then(m => m.Login)
  },

  {
    path: 'register',
    loadComponent: () => import('./componentes/registrer/registrer').then(m => m.Register)
  },

  {
    path: 'control-accesos',
    loadComponent: () => import('./componentes/control-accesos/control-accesos').then(m => m.ControlAccesosComponent),
    canActivate: [authGuard]
  },

  {
    path: 'dashboardAdministrador',
    loadComponent: () => import('./componentes/dashboard-administrador/dashboard-administrador').then(m => m.AdminDashboard),
    canActivate: [authGuard]
  },
  
  {
    path: 'dashboardVigilante',
    loadComponent: () => import('./componentes/dashboard-vigilante/dashboard-vigilante').then(m => m.DashboardVigilante),
    canActivate: [authGuard]
  },

  {
    path: 'dashboardUsuario',
    loadComponent: () => import('./componentes/dashboard-usuario/dashboard-usuario').then(m => m.DashboardUsuario),
    canActivate: [authGuard]
  },

  {
    path: 'inicio',
    loadComponent: () => import('./componentes/Inicio/inicio/inicio').then(m => m.Inicio)
  },

  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: '**', redirectTo: 'inicio' }
];