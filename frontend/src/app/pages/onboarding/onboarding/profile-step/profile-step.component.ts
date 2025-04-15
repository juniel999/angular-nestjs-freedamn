import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OnboardingService, ProfileData } from '../../../../services/onboarding.service';
import { AuthService } from '../../../../services/auth.service';
import { take, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-profile-step',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-step.component.html',
})
export class ProfileStepComponent {
  private fb = inject(FormBuilder);
  private onboardingService = inject(OnboardingService);
  private authService = inject(AuthService);
  
  profileForm!: FormGroup;
  private formValueChanges$: Subscription | null = null;
  private saveSubject = new Subject<ProfileData>();
  private saveSubscription: Subscription | null = null;
  
  pronounOptions = [
    { value: 'He/Him', label: 'He/Him' },
    { value: 'She/Her', label: 'She/Her' },
    { value: 'They/Them', label: 'They/Them' }
  ];
  
  // URL pattern for validation
  private urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
  
  ngOnInit(): void {
    this.initForm();
    this.fetchUserProfile();
    this.initSaveListener();
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    if (this.formValueChanges$) {
      this.formValueChanges$.unsubscribe();
    }
    if (this.saveSubscription) {
      this.saveSubscription.unsubscribe();
    }
    this.saveSubject.complete();
  }
  
  initForm(): void {
    // Create default date (today) formatted for input
    const today = new Date();
    const formattedToday = this.formatDateForInput(today);
    
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      pronouns: [''],
      title: [''],
      location: [''],
      birthdate: [formattedToday],
      bio: [''],
      socials: this.fb.group({
        facebook: [''],
        twitter: [''],
        instagram: [''],
        linkedin: [''],
        github: [''],
        website: ['']
      })
    });
    
    // Auto-save when form values change with debounce
    this.formValueChanges$ = this.profileForm.valueChanges
      .pipe(
        debounceTime(500), // Wait 500ms after the last event before emitting
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
      )
      .subscribe(values => {
        if (this.profileForm.valid) {
          this.saveSubject.next(values);
        }
      });
  }
  
  initSaveListener(): void {
    // Process save requests with a buffer
    this.saveSubscription = this.saveSubject
      .pipe(
        debounceTime(1000) // Ensure we don't hit the API too frequently
      )
      .subscribe(values => {
        this.saveProfile(values);
      });
  }
  
  // fetch user profile using Request
  fetchUserProfile(): void {
    this.onboardingService.getUserProfile().subscribe({
      next: (profile) => {
        if (profile) {
          // Format birthdate to yyyy-MM-dd before setting in form
          if (profile.birthdate) {
            const date = new Date(profile.birthdate);
            profile = {
              ...profile,
              birthdate: this.formatDateForInput(date)
            };
          }
          this.profileForm.patchValue(profile);
        }
      },
      error: (error) => console.error('Error fetching profile', error)
    });
  }
  
  saveProfile(profileData: ProfileData): void {
    // Convert date format before sending to API
    if (profileData.birthdate) {
      // Only convert if birthdate is not empty
      if (profileData.birthdate.trim() !== '') {
        try {
          profileData = {
            ...profileData,
            birthdate: new Date(profileData.birthdate).toISOString()
          };
        } catch (e) {
          // If conversion fails, remove the birthdate to prevent API errors
          delete profileData.birthdate;
          console.warn('Invalid date format removed from submission');
        }
      } else {
        // If birthdate is empty, remove it from the payload
        delete profileData.birthdate;
      }
    }
    
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      if (user) {
        this.onboardingService.updateUserProfile(user.sub, profileData).subscribe({
          next: (response) => {
            console.log('Profile updated successfully');
          },
          error: (error) => console.error('Error updating profile', error)
        });
      } else {
        console.error('No user found');
      }
    });
  }
  
  // Format date as yyyy-MM-dd for HTML date input
  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Helper method to get form control for template access
  getFormControl(controlName: string): any {
    return this.profileForm.get(controlName);
  }
  
  // Helper method to get social form controls
  getSocialControl(controlName: string): any {
    return this.profileForm.get('socials')?.get(controlName);
  }
}
