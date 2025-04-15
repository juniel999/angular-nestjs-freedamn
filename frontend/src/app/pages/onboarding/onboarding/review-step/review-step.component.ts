import { Component, OnInit, inject } from '@angular/core';
import { OnboardingService, ProfileData, TagData } from '../../../../services/onboarding.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-review-step',
  imports: [FontAwesomeModule],
  templateUrl: './review-step.component.html',
})
export class ReviewStepComponent {
  private onboardingService = inject(OnboardingService);
  
  isLoading = true;
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
      }
    });
    
    // Get tags
    this.onboardingService.getAvailableTags().subscribe({
      next: (tags) => {
        this.tags = tags;
        
        // Get user's selected tags
        // This assumes you have an endpoint to get user's tags
        // Alternatively, you could store this in the onboarding component and pass it to this component
        this.onboardingService.updateUserTags(undefined, []).subscribe(response => {
          this.selectedTagIds = response.tags;
        });
      },
      error: (error) => console.error('Error fetching tags', error)
    });
  }
  
  getSelectedTags(): TagData[] {
    return this.tags.filter(tag => this.selectedTagIds.includes(tag.id));
  }
}
