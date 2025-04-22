import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  OnboardingService,
  ProfileData,
} from '../../../services/onboarding.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import {
  debounceTime,
  distinctUntilChanged,
  Subject,
  Subscription,
  take,
} from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-socials',
  templateUrl: './socials.component.html',
  imports: [FontAwesomeModule, ReactiveFormsModule, CommonModule],
})
export class SocialsComponent implements OnInit, OnDestroy {
  socialsForm!: FormGroup;
  isLoading: boolean = false;
  isSaving: boolean = false;

  private saveSubject = new Subject<ProfileData>();
  private saveSubscription: Subscription | null = null;
  private formValueChanges$: Subscription | null = null;

  urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

  constructor(
    private fb: FormBuilder,
    private onboardingService: OnboardingService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.fetchUserProfile();
  }

  ngOnDestroy(): void {
    if (this.formValueChanges$) {
      this.formValueChanges$.unsubscribe();
    }
    if (this.saveSubscription) {
      this.saveSubscription.unsubscribe();
    }
    this.saveSubject.complete();
  }

  initForm(): void {
    this.socialsForm = this.fb.group({
      socials: this.fb.group({
        website: ['', [Validators.pattern(this.urlPattern)]],
        github: ['', [Validators.pattern(this.urlPattern)]],
        twitter: ['', [Validators.pattern(this.urlPattern)]],
        facebook: ['', [Validators.pattern(this.urlPattern)]],
        instagram: ['', [Validators.pattern(this.urlPattern)]],
        linkedin: ['', [Validators.pattern(this.urlPattern)]],
      }),
    });

    this.formValueChanges$ = this.socialsForm.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
        )
      )
      .subscribe((values) => {
        if (this.socialsForm.valid) {
          this.saveSubject.next(values);
        }
      });
  }

  fetchUserProfile(): void {
    this.isLoading = true;

    // Check localStorage first
    const cachedProfile = localStorage.getItem('userProfile');
    if (cachedProfile) {
      const profile = JSON.parse(cachedProfile);
      if (profile && profile.socials) {
        this.socialsForm.patchValue({ socials: profile.socials });
        this.isLoading = false;
        return;
      }
    }

    // If no cache, fetch from API
    this.onboardingService.getUserProfile().subscribe({
      next: (profile) => {
        if (profile) {
          // Store in localStorage
          localStorage.setItem('userProfile', JSON.stringify(profile));
          if (profile.socials) {
            this.socialsForm.patchValue({ socials: profile.socials });
          }
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching profile', error);
        this.toastService.show('Failed to load social links', 'error');
        this.isLoading = false;
      },
    });
  }

  saveSocials(profileData: ProfileData): void {
    if (this.socialsForm.invalid) {
      return;
    }

    this.isSaving = true;

    this.authService.currentUser$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.onboardingService
          .updateUserProfile(user.sub, profileData)
          .subscribe({
            next: () => {
              // Update localStorage with new data
              const cachedProfile = localStorage.getItem('userProfile');
              if (cachedProfile) {
                const profile = JSON.parse(cachedProfile);
                profile.socials = profileData.socials;
                localStorage.setItem('userProfile', JSON.stringify(profile));
              }

              this.toastService.show(
                'Social links updated successfully',
                'success'
              );
              this.isSaving = false;
            },
            error: (error) => {
              console.error('Error updating social links', error);
              this.toastService.show('Failed to update social links', 'error');
              this.isSaving = false;
            },
          });
      } else {
        this.toastService.show('No user found', 'error');
        this.isSaving = false;
      }
    });
  }
}
