import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { RouterModule } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { take, switchMap, takeUntil } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { UserStats, UserType } from '../../types/user.type';
import { TagData } from '../../types/tag.type';
import { SocialLinkButtonComponent } from '../../components/social-link-button/social-link-button.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    RouterModule,
    SocialLinkButtonComponent,
  ],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  userProfile = signal<UserType | null>(null);
  userStats = signal<UserStats | null>(null);
  userTags = signal<TagData[]>([]);
  isLoading = signal(true);
  isCurrentUser = signal(false);

  defaultAvatar = 'https://ui-avatars.com/api/?name=User&background=random';
  defaultCoverPhoto = 'assets/images/default-cover.jpg';

  ngOnInit() {
    this.loadProfileData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProfileData() {
    // Check localStorage first
    const cachedProfile = localStorage.getItem('userProfile');
    if (cachedProfile) {
      const profile = JSON.parse(cachedProfile);
      this.userProfile.set(profile);
      this.isLoading.set(false);
    }

    // Load fresh data
    this.authService.currentUser$
      .pipe(
        take(1),
        switchMap((user) => {
          if (!user) {
            throw new Error('No authenticated user found');
          }
          this.isCurrentUser.set(true);

          return forkJoin({
            profile: this.userService.getUserProfile(user.sub),
            stats: this.userService.getUserStats(user.sub),
            tags: this.userService.getUserPreferredTags(user.sub),
          });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ profile, stats, tags }) => {
          if (profile) {
            this.userProfile.set(profile);
            localStorage.setItem('userProfile', JSON.stringify(profile));
          }
          this.userStats.set(stats);
          this.userTags.set(tags);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
          // Error handling could be improved by adding a toast service
          console.error('Error loading profile data:', error);
        },
      });
  }
}
