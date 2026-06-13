import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export const authGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);

  // Forzamos el tipado como 'any' para saltar la validación estricta de TypeScript en compilación
  const env = environment as any;

  // Inicializas Supabase usando las variables inyectadas
  const supabase = createClient(env.supabaseUrl, env.supabaseKey);

  // Verificamos la sesión actual
  const { data } = await supabase.auth.getSession();

  if (data?.session) {
    return true; 
  } else {
    console.warn('Acceso denegado a OmniDoor. Se requiere autenticación.');
    router.navigate(['/login']); 
    return false;
  }
};