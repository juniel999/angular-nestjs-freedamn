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
  selector: 'app-user-info',
  templateUrl: './user-info.component.html',
  imports: [FontAwesomeModule, ReactiveFormsModule, CommonModule],
})
export class UserInfoComponent implements OnInit, OnDestroy {
  profileForm!: FormGroup;
  isLoading: boolean = false;
  isSaving: boolean = false;

  private saveSubject = new Subject<ProfileData>();
  private saveSubscription: Subscription | null = null;
  private formValueChanges$: Subscription | null = null;

  pronounOptions = [
    { value: 'He/Him', label: 'He/Him' },
    { value: 'She/Her', label: 'She/Her' },
    { value: 'They/Them', label: 'They/Them' },
  ];

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
    const today = new Date();
    const formattedToday = this.formatDateForInput(today);

    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      pronouns: [''],
      title: [''],
      location: [''],
      birthdate: [formattedToday],
      bio: ['', [Validators.maxLength(500)]],
    });

    this.formValueChanges$ = this.profileForm.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
        )
      )
      .subscribe((values) => {
        if (this.profileForm.valid) {
          this.saveSubject.next(values);
        }
      });
  }

  fetchUserProfile(): void {
    this.isLoading = true;
    this.onboardingService.getUserProfile().subscribe({
      next: (profile) => {
        if (profile) {
          if (profile.birthdate) {
            const date = new Date(profile.birthdate);
            profile = {
              ...profile,
              birthdate: this.formatDateForInput(date),
            };
          }
          this.profileForm.patchValue(profile);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching profile', error);
        this.toastService.show('Failed to load profile information', 'error');
        this.isLoading = false;
      },
    });
  }

  saveProfile(profileData: ProfileData): void {
    if (this.profileForm.invalid) {
      return;
    }

    this.isSaving = true;

    if (profileData.birthdate) {
      if (profileData.birthdate.trim() !== '') {
        try {
          profileData = {
            ...profileData,
            birthdate: new Date(profileData.birthdate).toISOString(),
          };
        } catch (e) {
          delete profileData.birthdate;
          console.warn('Invalid date format removed from submission');
        }
      } else {
        delete profileData.birthdate;
      }
    }

    this.authService.currentUser$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.onboardingService
          .updateUserProfile(user.sub, profileData)
          .subscribe({
            next: () => {
              this.toastService.show('Profile updated successfully', 'success');
              this.isSaving = false;
            },
            error: (error) => {
              console.error('Error updating profile', error);
              this.toastService.show('Failed to update profile', 'error');
              this.isSaving = false;
            },
          });
      } else {
        this.toastService.show('No user found', 'error');
        this.isSaving = false;
      }
    });
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
