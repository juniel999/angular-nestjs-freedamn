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
import { BlogService } from '../../services/blog.service';
import { ToastService } from '../../services/toast.service';

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
  private blogService = inject(BlogService);
  private toastService = inject(ToastService);
  private destroy$ = new Subject<void>();

  userProfile = signal<UserType | null>(null);
  userStats = signal<UserStats | null>(null);
  userTags = signal<TagData[]>([]);
  userPosts = signal<any[]>([]);
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
            posts: this.userService.getUserPosts(user.sub),
          });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ profile, stats, tags, posts }) => {
          if (profile) {
            this.userProfile.set(profile);
            localStorage.setItem('userProfile', JSON.stringify(profile));
          }
          this.userStats.set(stats);
          this.userTags.set(tags);
          this.userPosts.set(posts.posts || []);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
          console.error('Error loading profile data:', error);
        },
      });
  }

  getExcerpt(content: string, maxLength: number = 150): string {
    // Strip HTML tags
    const plainText = content.replace(/<[^>]*>?/gm, '');

    if (plainText.length <= maxLength) {
      return plainText;
    }

    // Find the last space before maxLength
    const lastSpace = plainText.substring(0, maxLength).lastIndexOf(' ');
    const excerpt = plainText.substring(
      0,
      lastSpace > 0 ? lastSpace : maxLength
    );

    return `${excerpt}...`;
  }

  hasUserLiked(blog: any): boolean {
    const userId = localStorage.getItem('userId');
    return blog.likes.includes(userId || '');
  }

  toggleLike(blog: any, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    // Simple check if the user already liked this post
    const userId = localStorage.getItem('userId');
    const hasLiked = blog.likes.includes(userId || '');

    if (hasLiked) {
      this.blogService.unlikeBlog(blog._id).subscribe({
        next: (updatedBlog) => {
          // Update the blog in the local state
          const posts = this.userPosts();
          const index = posts.findIndex((p) => p._id === blog._id);
          if (index !== -1) {
            posts[index] = updatedBlog;
            this.userPosts.set([...posts]);
          }
        },
        error: () => {
          this.toastService.show('Failed to unlike post', 'error');
        },
      });
    } else {
      this.blogService.likeBlog(blog._id).subscribe({
        next: (updatedBlog) => {
          // Update the blog in the local state
          const posts = this.userPosts();
          const index = posts.findIndex((p) => p._id === blog._id);
          if (index !== -1) {
            posts[index] = updatedBlog;
            this.userPosts.set([...posts]);
          }
        },
        error: () => {
          this.toastService.show('Failed to like post', 'error');
        },
      });
    }
  }
}
