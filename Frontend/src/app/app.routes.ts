import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./componentes/inicio/inicio').then(m => m.InicioComponent)
  },

  {
    path: 'inicio',
    loadComponent: () => import('./componentes/inicio/inicio').then(m => m.InicioComponent)
  },

  {
    path: 'login',
    loadComponent: () => import('./componentes/login/login').then(m => m.LoginComponent)
  },

  {
    path: 'register',
    loadComponent: () => import('./componentes/registrer/registrer').then(m => m.RegisterComponent)
  },

  {
    path: 'control-accesos',
    loadComponent: () => import('./componentes/control-accesos/control-accesos').then(m => m.ControlAccesosComponent),
    canActivate: [authGuard]
  },

  {
    path: 'dashboardAdministrador',
    loadComponent: () => import('./componentes/dashboard-administrador/dashboard-administrador').then(m => m.AdminDashboardComponent),
    canActivate: [authGuard]
  },
  
  {
    path: 'dashboardVigilante',
    loadComponent: () => import('./componentes/dashboard-vigilante/dashboard-vigilante').then(m => m.DashboardVigilanteComponent),
    canActivate: [authGuard]
  },

  {
    path: 'dashboardUsuario',
    loadComponent: () => import('./componentes/dashboard-usuario/dashboard-usuario').then(m => m.DashboardUsuarioComponent),
    canActivate: [authGuard]
  },

  { path: '**', redirectTo: '' }
];