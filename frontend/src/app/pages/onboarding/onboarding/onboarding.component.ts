import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet, ActivatedRoute, NavigationEnd } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { OnboardingService } from '../../../services/onboarding.service';
import { AuthService } from '../../../services/auth.service';
import { filter } from 'rxjs/operators';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css']
})
export class OnboardingComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private onboardingService = inject(OnboardingService);
  private authService = inject(AuthService);
  
  currentStep = 1;
  
  steps = [
    { route: 'step-1', name: 'Profile Info', completed: false },
    { route: 'step-2', name: 'Avatar & Cover', completed: false },
    { route: 'step-3', name: 'Tags & Interests', completed: false },
    { route: 'review', name: 'Review', completed: false }
  ];

  // This would be used to store and pass data between steps
  onboardingData: any = {
    profile: null,
    avatar: null,
    coverPhoto: null,
    tags: []
  };

  ngOnInit(): void {
    // Check if the user has already completed onboarding
    this.onboardingService.getOnboardingStatus().subscribe({
      next: (response) => {
        if (response.completed) {
          this.router.navigate(['/']);
        }
      },
      error: (error) => console.error('Error checking onboarding status', error)
    });
    
    // Listen to route changes to update the current step
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      setTimeout(() => this.updateCurrentStep(), 0);
    });
    
    // Initialize the current step based on the initial URL
    this.updateCurrentStep();
  }
  
  private updateCurrentStep(): void {
    // Get the current route URL
    const childRoute = this.route.firstChild?.snapshot.url[0]?.path || 'step-1';
    
    if (childRoute === 'step-1') this.currentStep = 1;
    else if (childRoute === 'step-2') this.currentStep = 2;
    else if (childRoute === 'step-3') this.currentStep = 3;
    else if (childRoute === 'review') this.currentStep = 4;
    
    // Mark previous steps as completed
    this.steps.forEach((step, index) => {
      step.completed = index < this.currentStep - 1;
    });
  }

  goToNextStep(): void {
    if (this.currentStep < this.steps.length) {
      // The steps array is 0-indexed but currentStep is 1-indexed
      const nextStepIndex = this.currentStep; // Current step is already the index of the next step
      const nextStep = this.steps[nextStepIndex];
      
      this.router.navigate([nextStep.route], { relativeTo: this.route })
        .then(() => {
          this.currentStep++;
          this.updateCurrentStep();
        });
    }
  }

  goToPreviousStep(): void {
    if (this.currentStep > 1) {
      // The steps array is 0-indexed but currentStep is 1-indexed
      const prevStepIndex = this.currentStep - 2;
      const prevStep = this.steps[prevStepIndex];
      
      this.router.navigate([prevStep.route], { relativeTo: this.route })
        .then(() => {
          this.currentStep--;
          this.updateCurrentStep();
        });
    }
  }

  completeOnboarding(): void {
    this.onboardingService.completeOnboarding().subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (error) => console.error('Error completing onboarding', error)
    });
  }
}
