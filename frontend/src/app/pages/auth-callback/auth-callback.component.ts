import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { CommonModule } from '@angular/common';
import { OnboardingService } from '../../services/onboarding.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template:
    '<div class="min-h-screen flex items-center justify-center"><div class="loading loading-spinner text-primary loading-lg"></div></div>',
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService,
    private onboardingService: OnboardingService
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    const error = this.route.snapshot.queryParamMap.get('error');

    if (error) {
      this.toastService.show(`Authentication failed: ${error}`, 'error');
      this.router.navigate(['/signin']);
      return;
    }

    if (!token) {
      this.toastService.show(
        'Authentication failed: No token received',
        'error'
      );
      this.router.navigate(['/signin']);
      return;
    }

    // Handle the OAuth callback and wait for profile to be loaded
    this.authService.handleOAuthCallback(token);

    // Wait for the user profile to be loaded with a delay to ensure profile is fetched
    setTimeout(() => {
      this.authService.currentUser$.pipe(take(1)).subscribe({
        next: (user) => {
          if (!user) {
            console.error('No user profile loaded');
            this.router.navigate(['/']);
            return;
          }

          // Check onboarding status
          this.onboardingService.getOnboardingStatus(user.sub).subscribe({
            next: (status) => {
              this.toastService.show(
                'Successfully logged in with Google!',
                'success'
              );

              if (!status.completed) {
                window.location.href = '/onboarding';
              } else {
                window.location.href = '/';
              }
            },
            error: () => {
              // On error checking onboarding status, force reload to home
              window.location.href = '/';
            },
          });
        },
        error: () => {
          // On error getting profile, force reload to home
          window.location.href = '/';
        },
      });
    }, 1000); // Give time for the profile to be loaded
  }
}
