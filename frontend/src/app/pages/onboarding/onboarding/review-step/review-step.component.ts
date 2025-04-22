import { Component, inject } from '@angular/core';
import {
  OnboardingService,
  ProfileData,
} from '../../../../services/onboarding.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { TagData } from '../../../../types/tag.type';

@Component({
  selector: 'app-review-step',
  standalone: true,
  imports: [FontAwesomeModule, CommonModule],
  templateUrl: './review-step.component.html',
})
export class ReviewStepComponent {
  private onboardingService = inject(OnboardingService);
  private router = inject(Router);

  isLoading = true;
  isCompleting = false;
  profile: ProfileData | null = null;
  tags: TagData[] = [];
  selectedTagIds: string[] = [];

  avatarUrl: string | null = null;
  coverPhotoUrl: string | null = null;

  ngOnInit(): void {
    this.fetchUserData();
  }

  fetchUserData(): void {
    this.isLoading = true;

    // Get profile data
    this.onboardingService.getUserProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.avatarUrl = profile.avatar || null;
        this.coverPhotoUrl = profile.coverphoto || null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching profile', error);
        this.isLoading = false;
      },
    });

    // Get tags with better error handling and logging
    this.onboardingService.getAvailableTags().subscribe({
      next: (tags) => {
        console.log('Available tags fetched:', tags);
        this.tags = tags;

        // Get user's selected tags
        this.onboardingService.getUserTags().subscribe({
          next: (response) => {
            console.log('User tags response:', response);
            if (response && response.tags) {
              // Store tag names instead of IDs (since backend now stores names)
              this.selectedTagIds = response.tags.map((tagName) =>
                tagName.toLowerCase().trim()
              );
              console.log('Selected tag names:', this.selectedTagIds);
            } else {
              console.warn('No tags in response or invalid format:', response);
            }
          },
          error: (error) => {
            console.error('Error fetching user tags:', error);
          },
        });
      },
      error: (error) => {
        console.error('Error fetching available tags:', error);
      },
    });
  }

  getSelectedTags(): TagData[] {
    if (!this.tags || !this.selectedTagIds) {
      return [];
    }

    // Match selected tag names with available tags
    const selectedTags = this.tags.filter((tag) =>
      this.selectedTagIds.some((name) => name === tag.name.toLowerCase().trim())
    );

    console.log('Selected tags for display:', selectedTags);
    return selectedTags;
  }

  /**
   * Check if the user has any social links
   */
  hasSocialLinks(): boolean {
    if (!this.profile || !this.profile.socials) {
      return false;
    }

    const socials = this.profile.socials;
    return !!(
      socials.facebook ||
      socials.twitter ||
      socials.instagram ||
      socials.linkedin ||
      socials.github ||
      socials.website
    );
  }

  completeOnboarding(): void {
    this.isCompleting = true;

    // Make sure we save the selected tags one more time before completing onboarding
    this.onboardingService
      .updateUserTags(undefined, this.selectedTagIds)
      .pipe(switchMap(() => this.onboardingService.completeOnboarding()))
      .subscribe({
        next: () => {
          this.isCompleting = false;
          // Navigate to home page or dashboard after completion
          this.router.navigate(['/']);
        },
        error: (error) => {
          console.error('Error completing onboarding', error);
          this.isCompleting = false;
        },
      });
  }
}
