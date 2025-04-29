import { Component, inject, Output, EventEmitter } from '@angular/core';
import { OnboardingService } from '../../../../services/onboarding.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-avatar-step',
  imports: [FontAwesomeModule],
  templateUrl: './avatar-step.component.html',
})
export class AvatarStepComponent {
  private onboardingService = inject(OnboardingService);

  @Output() uploadComplete = new EventEmitter<boolean>();

  avatarFile: File | null = null;
  coverPhotoFile: File | null = null;

  avatarPreview: string | null = null;
  coverPhotoPreview: string | null = null;

  isUploadingAvatar = false;
  isUploadingCover = false;

  avatarUpdated = false;
  coverPhotoUpdated = false;

  avatarSizeError = false;
  coverPhotoSizeError = false;
  avatarError = '';
  coverPhotoError = '';

  private maxAvatarSizeMB = 2; // 2MB max file size for avatars
  private maxCoverSizeMB = 5; // 5MB max file size for cover photos

  ngOnInit(): void {
    this.loadExistingImages();
  }

  loadExistingImages(): void {
    this.onboardingService.getUserProfile().subscribe({
      next: (profile) => {
        if (profile.avatar) {
          this.avatarPreview = profile.avatar;
        }
        if (profile.coverphoto) {
          this.coverPhotoPreview = profile.coverphoto;
        }
      },
      error: (error) => {
        console.error('Error loading profile images', error);
      },
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Reset previous errors
      this.avatarSizeError = false;
      this.avatarError = '';

      // Check file size (convert maxAvatarSizeMB to bytes)
      if (file.size > this.maxAvatarSizeMB * 1024 * 1024) {
        this.avatarSizeError = true;
        this.avatarError = `Image too large! Maximum size is ${this.maxAvatarSizeMB}MB.`;
        return;
      }

      this.avatarFile = file;
      this.createImagePreview(this.avatarFile, 'avatar');
    }
  }

  onCoverPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Reset previous errors
      this.coverPhotoSizeError = false;
      this.coverPhotoError = '';

      // Check file size (convert maxCoverSizeMB to bytes)
      if (file.size > this.maxCoverSizeMB * 1024 * 1024) {
        this.coverPhotoSizeError = true;
        this.coverPhotoError = `Image too large! Maximum size is ${this.maxCoverSizeMB}MB.`;
        return;
      }

      this.coverPhotoFile = file;
      this.createImagePreview(this.coverPhotoFile, 'cover');
    }
  }

  createImagePreview(file: File, type: 'avatar' | 'cover'): void {
    const reader = new FileReader();
    reader.onload = () => {
      if (type === 'avatar') {
        this.avatarPreview = reader.result as string;
      } else {
        this.coverPhotoPreview = reader.result as string;
      }
    };
    reader.readAsDataURL(file);
  }

  uploadAvatar(): void {
    if (this.avatarFile) {
      this.isUploadingAvatar = true;
      this.avatarError = ''; // Clear any previous error
      this.onboardingService
        .uploadAvatar(undefined, this.avatarFile)
        .subscribe({
          next: (response) => {
            this.isUploadingAvatar = false;
            this.avatarPreview = response.avatar;
            this.avatarUpdated = true;
            this.uploadComplete.emit(true);
            setTimeout(() => (this.avatarUpdated = false), 3000);
          },
          error: (error) => {
            console.error('Error uploading avatar', error);
            this.isUploadingAvatar = false;
            this.avatarSizeError = true;
            if (error.error && error.error.message) {
              this.avatarError = error.error.message;
            } else if (error.status === 413) {
              this.avatarError = `Image too large! Maximum size is ${this.maxAvatarSizeMB}MB.`;
            } else {
              this.avatarError = 'Failed to upload image. Please try again.';
            }
          },
        });
    }
  }

  uploadCoverPhoto(): void {
    if (this.coverPhotoFile) {
      this.isUploadingCover = true;
      this.coverPhotoError = ''; // Clear any previous error
      this.onboardingService
        .uploadCoverPhoto(undefined, this.coverPhotoFile)
        .subscribe({
          next: (response) => {
            this.isUploadingCover = false;
            this.coverPhotoPreview = response.coverphoto;
            this.coverPhotoUpdated = true;
            this.uploadComplete.emit(true);
            setTimeout(() => (this.coverPhotoUpdated = false), 3000);
          },
          error: (error) => {
            console.error('Error uploading cover photo', error);
            this.isUploadingCover = false;
            this.coverPhotoSizeError = true;
            if (error.error && error.error.message) {
              this.coverPhotoError = error.error.message;
            } else if (error.status === 413) {
              this.coverPhotoError = `Image too large! Maximum size is ${this.maxCoverSizeMB}MB.`;
            } else {
              this.coverPhotoError =
                'Failed to upload image. Please try again.';
            }
          },
        });
    }
  }
}
