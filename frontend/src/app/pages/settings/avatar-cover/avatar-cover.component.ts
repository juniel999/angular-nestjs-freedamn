import { Component, OnInit } from '@angular/core';
import { OnboardingService } from '../../../services/onboarding.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { take } from 'rxjs/operators';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avatar-cover',
  templateUrl: './avatar-cover.component.html',
  imports: [FontAwesomeModule, ReactiveFormsModule, CommonModule],
})
export class AvatarCoverComponent implements OnInit {
  avatarUrl: string = '';
  coverUrl: string = '';
  isLoading: boolean = false;
  isAvatarUploading: boolean = false;
  isCoverUploading: boolean = false;

  avatarPreview: string | null = null;
  coverPreview: string | null = null;

  userId: string = '';

  constructor(
    private onboardingService: OnboardingService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();

    this.authService.currentUser$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.userId = user.sub;
      }
    });
  }

  loadUserProfile(): void {
    this.isLoading = true;
    this.onboardingService.getUserProfile().subscribe({
      next: (profile) => {
        this.avatarUrl = profile?.avatar || '';
        this.coverUrl = profile?.coverphoto || '';
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading profile', error);
        this.toastService.show('Failed to load profile images', 'error');
        this.isLoading = false;
      },
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.toastService.show('Please select an image file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.toastService.show('Image must be smaller than 5MB', 'error');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.avatarPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.toastService.show('Please select an image file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.toastService.show('Image must be smaller than 5MB', 'error');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.coverPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  uploadAvatar(): void {
    const avatarInput = document.getElementById(
      'avatar-upload'
    ) as HTMLInputElement;
    const avatarFile = avatarInput?.files?.[0];

    if (!avatarFile) {
      this.toastService.show('Please select an image to upload', 'error');
      return;
    }

    this.isAvatarUploading = true;

    this.onboardingService.uploadAvatar(this.userId, avatarFile).subscribe({
      next: (response) => {
        this.avatarUrl = response.url;
        this.avatarPreview = null;
        this.toastService.show('Avatar updated successfully', 'success');
        this.isAvatarUploading = false;

        // Reset the input
        avatarInput.value = '';
      },
      error: (error) => {
        console.error('Error uploading avatar', error);
        this.toastService.show('Failed to upload avatar', 'error');
        this.isAvatarUploading = false;
      },
    });
  }

  uploadCover(): void {
    const coverInput = document.getElementById(
      'cover-upload'
    ) as HTMLInputElement;
    const coverFile = coverInput?.files?.[0];

    if (!coverFile) {
      this.toastService.show('Please select an image to upload', 'error');
      return;
    }

    this.isCoverUploading = true;

    this.onboardingService.uploadCoverPhoto(this.userId, coverFile).subscribe({
      next: (response) => {
        this.coverUrl = response.url;
        this.coverPreview = null;
        this.toastService.show('Cover photo updated successfully', 'success');
        this.isCoverUploading = false;

        // Reset the input
        coverInput.value = '';
      },
      error: (error) => {
        console.error('Error uploading cover photo', error);
        this.toastService.show('Failed to upload cover photo', 'error');
        this.isCoverUploading = false;
      },
    });
  }

  cancelAvatarUpload(): void {
    this.avatarPreview = null;
    const avatarInput = document.getElementById(
      'avatar-upload'
    ) as HTMLInputElement;
    if (avatarInput) {
      avatarInput.value = '';
    }
  }

  cancelCoverUpload(): void {
    this.coverPreview = null;
    const coverInput = document.getElementById(
      'cover-upload'
    ) as HTMLInputElement;
    if (coverInput) {
      coverInput.value = '';
    }
  }
}
