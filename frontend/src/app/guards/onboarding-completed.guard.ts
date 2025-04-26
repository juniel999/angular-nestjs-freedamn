import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { OnboardingService } from '../services/onboarding.service';
import { AuthService } from '../services/auth.service';
import { map, catchError, of, switchMap, take } from 'rxjs';

export const onboardingCompletedGuard: CanActivateFn = (route, state) => {
  const onboardingService = inject(OnboardingService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Get the current user from the auth service observable
  return authService.currentUser$.pipe(
    take(1),
    switchMap((currentUser) => {
      // If not logged in, allow access to public routes
      if (!currentUser) {
        return of(true);
      }

      // Check if the user has completed onboarding
      return onboardingService.getOnboardingStatus(currentUser.sub).pipe(
        map((status) => {
          if (!status.completed) {
            // If onboarding is not completed, redirect to onboarding
            router.navigate(['/onboarding']);
            return false;
          }
          // Allow access to the route
          return true;
        }),
        catchError(() => {
          // On error, redirect to onboarding (safer default)
          router.navigate(['/onboarding']);
          return of(false);
        })
      );
    })
  );
};
