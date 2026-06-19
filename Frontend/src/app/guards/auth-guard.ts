import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('access'); 


  if (token) {
    return true; 
  } else {
    console.warn('Acceso denegado a OmniDoor. Se requiere autenticación por Token.');
    router.navigate(['/login']); 
    return false;
  }
};