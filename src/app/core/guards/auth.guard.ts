// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Espera a que el estado de auth se inicialice */
async function waitForAuth(auth: AuthService): Promise<void> {
  let attempts = 0;
  while (auth.loading() && attempts < 30) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }
}

/** Protege rutas que requieren estar autenticado */
export const authGuard: CanActivateFn = async () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  await waitForAuth(auth);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login']);
};

/** Protege rutas que solo puede ver el admin */
export const adminGuard: CanActivateFn = async () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  await waitForAuth(auth);
  if (auth.isAdmin()) return true;
  if (auth.isAuthenticated()) return router.createUrlTree(['/dashboard']);
  return router.createUrlTree(['/login']);
};

/** Redirige al dashboard si ya está autenticado */
export const publicGuard: CanActivateFn = async () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  await waitForAuth(auth);
  if (!auth.isAuthenticated()) return true;
  return router.createUrlTree(['/dashboard']);
};