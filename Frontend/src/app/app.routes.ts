import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
{ path: 'login', loadComponent: () => import('./componentes/login/login').then(m => m.Login) },


{ 
    path: 'dashboard', 
    loadComponent: () => import('./componentes/login/login').then(m => m.Login), 
    canActivate: [authGuard] 
},

    { path: '', redirectTo: 'login', pathMatch: 'full' }
];