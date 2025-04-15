import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { OnboardingService } from '../services/onboarding.service';
import { AuthService } from '../services/auth.service';
import { map, catchError, of, switchMap, take } from 'rxjs';

export const onboardingGuard: CanActivateFn = (route, state) => {
  const onboardingService = inject(OnboardingService);
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Get the current user from the auth service observable
  return authService.currentUser$.pipe(
    take(1),
    switchMap(currentUser => {
      if (!currentUser) {
        // If not logged in, redirect to login
        router.navigate(['/signin']);
        return of(false);
      }
      
      // Check if the user has already completed onboarding
      return onboardingService.getOnboardingStatus(currentUser.sub).pipe(
        map(status => {
          if (status.completed) {
            // If onboarding is already completed, redirect to home
            router.navigate(['/']);
            return false;
          }
          // Allow access to onboarding
          return true;
        }),
        catchError(() => {
          // On error, allow access to onboarding (safer default)
          return of(true);
        })
      );
    })
  );
};
