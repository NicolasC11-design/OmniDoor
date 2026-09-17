import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('access');
  const usuarioRaw = localStorage.getItem('usuario');

  if (token && usuarioRaw) {
    const usuario = JSON.parse(usuarioRaw);
    const expectedRole = route.data?.['role'];
    
    // Normalizar el rol del usuario para que coincida con las rutas
    let userRole = usuario.rol?.toLowerCase() || '';
    if (userRole === 'admin') userRole = 'administrador';
    if (userRole === 'seguridad') userRole = 'vigilante';
    if (userRole === 'aprendiz') userRole = 'usuario';

    if (expectedRole && userRole !== expectedRole.toLowerCase() && expectedRole !== 'todos') {
      console.warn(`Acceso denegado. Se requiere el rol: ${expectedRole}`);
      // Redirigir al dashboard correspondiente a su rol real normalizado
      if (userRole === 'administrador') router.navigate(['/dashboardAdministrador']);
      else if (userRole === 'vigilante') router.navigate(['/dashboardVigilante']);
      else router.navigate(['/dashboardUsuario']);
      return false;
    }

    return true; 
  } else {
    console.warn('Acceso denegado a OmniDoor. Se requiere autenticación por Token.');
    router.navigate(['/login']); 
    return false;
  }
};