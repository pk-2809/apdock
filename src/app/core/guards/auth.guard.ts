import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protects authenticated routes (e.g., /home).
 * Redirects unauthenticated visitors to /auth.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = await auth.ensureAuthLoaded();
  if (!isAuthenticated) {
    return router.createUrlTree(['/auth']);
  }
  return true;
};

/**
 * Protects guest-only routes (e.g., /auth).
 * Redirects authenticated users to /home.
 */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = await auth.ensureAuthLoaded();
  if (isAuthenticated) {
    return router.createUrlTree(['/home']);
  }
  return true;
};
