// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Esperar a que se inicialice el estado de auth
  let attempts = 0;
  while (auth.loading() && attempts < 20) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }

  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

export const publicGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  let attempts = 0;
  while (auth.loading() && attempts < 20) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }

  if (!auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};