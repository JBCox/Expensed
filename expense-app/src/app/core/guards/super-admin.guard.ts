import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SuperAdminService } from '../services/super-admin.service';

/** Timeout for admin check (5 seconds) */
const ADMIN_CHECK_TIMEOUT_MS = 5000;

/**
 * Guard that prevents access to super admin routes
 * Redirects to dashboard if user is not a super admin
 *
 * IMPORTANT: Uses async waitForAdminCheck() to prevent race conditions
 * where the guard might evaluate before the admin status check completes.
 * Includes a 5-second timeout to prevent hanging if database is slow.
 */
export const superAdminGuard: CanActivateFn = async () => {
  const superAdminService = inject(SuperAdminService);
  const router = inject(Router);

  // Wait for admin status check to complete before evaluating
  // This prevents race conditions where isSuperAdmin$ might still be false
  // because checkSuperAdminStatus() hasn't finished yet
  // Timeout after 5 seconds to prevent hanging if database is slow
  const isSuperAdmin = await Promise.race([
    superAdminService.waitForAdminCheck(),
    new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), ADMIN_CHECK_TIMEOUT_MS)
    ),
  ]);

  if (isSuperAdmin) {
    return true;
  }

  // Redirect to home page (non-super-admins should go to regular user area)
  return router.createUrlTree(['/home']);
};

/**
 * Guard that checks for specific super admin permission
 * Usage: canActivate: [superAdminPermissionGuard('manage_subscriptions')]
 *
 * IMPORTANT: Uses async waitForAdminCheck() to prevent race conditions
 * Includes a 5-second timeout to prevent hanging if database is slow.
 */
export function superAdminPermissionGuard(
  permission: 'view_organizations' | 'manage_subscriptions' | 'issue_refunds' | 'create_coupons' | 'view_analytics' | 'manage_super_admins'
): CanActivateFn {
  return async () => {
    const superAdminService = inject(SuperAdminService);
    const router = inject(Router);

    // Wait for admin check to complete first with timeout
    const isAdmin = await Promise.race([
      superAdminService.waitForAdminCheck(),
      new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(false), ADMIN_CHECK_TIMEOUT_MS)
      ),
    ]);

    // If not admin (or timeout), redirect to home
    if (!isAdmin) {
      return router.createUrlTree(['/home']);
    }

    // Now check the specific permission
    if (superAdminService.hasPermission(permission)) {
      return true;
    }

    // Redirect to super admin dashboard without the specific feature
    return router.createUrlTree(['/super-admin']);
  };
}
