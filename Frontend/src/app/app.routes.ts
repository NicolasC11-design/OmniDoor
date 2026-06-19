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
    path: 'dashboard', 
    loadComponent: () => import('./componentes/dashboard-administrador/dashboard-administrador').then(m => m.AdminDashboard), 
    canActivate: [authGuard] 
  },

  // 🔄 4. Redirecciones por defecto
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' } 
];