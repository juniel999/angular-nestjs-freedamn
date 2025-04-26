import { Component, inject, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { take, switchMap, takeUntil, catchError, tap } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { UserStats, UserType } from '../../types/user.type';
import { TagData } from '../../types/tag.type';
import { SocialLinkButtonComponent } from '../../components/social-link-button/social-link-button.component';
import { BlogService } from '../../services/blog.service';
import { ToastService } from '../../services/toast.service';
import { BlogPostType } from '../../types/blog-post.type';
import { BlogCardComponent } from '../../components/blog-card/blog-card.component';

@Component({
  selector: 'app-profile',
  imports: [
    FontAwesomeModule,
    RouterModule,
    SocialLinkButtonComponent,
    BlogCardComponent,
  ],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private blogService = inject(BlogService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  userProfile = signal<UserType | null>(null);
  userStats = signal<UserStats | null>(null);
  userTags = signal<TagData[]>([]);
  userPosts = signal<BlogPostType[]>([]);

  isLoading = signal(true);
  isCurrentUser = signal(false);
  isLoggedIn = signal(false);
  error = signal<string | null>(null);

  defaultAvatar = 'https://ui-avatars.com/api/?background=E5B400&name=';
  defaultCoverPhoto = 'assets/images/default-cover.jpg';

  ngOnInit() {
    // Check authentication status
    this.authService.currentUser$
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe((user) => {
        this.isLoggedIn.set(!!user);
      });

    this.loadProfileData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProfileData() {
    const username = this.route.snapshot.paramMap.get('username');
    this.error.set(null);
    this.isLoading.set(true);

    // If not logged in and no username parameter, show error
    if (!username && !this.isLoggedIn()) {
      this.error.set('Please sign in to view your profile');
      this.isLoading.set(false);
      return;
    }

    // If viewing own profile
    if (!username) {
      this.isCurrentUser.set(true);
      this.authService.currentUser$
        .pipe(
          take(1),
          switchMap((currentUser) => {
            if (!currentUser) throw new Error('No authenticated user found');
            return forkJoin({
              profile: this.userService.getUserProfile(currentUser.sub),
              stats: this.userService.getUserStats(currentUser.sub),
              tags: this.userService.getUserPreferredTags(currentUser.sub),
              posts: this.userService.getUserPosts(currentUser.sub),
            });
          }),
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: ({ profile, stats, tags, posts }) => {
            this.userProfile.set(profile);
            this.userStats.set(stats);
            this.userTags.set(tags);
            this.userPosts.set(
              Array.isArray(posts) ? posts : posts.posts || []
            );
            this.isLoading.set(false);
          },
          error: (error) => {
            console.error('Error loading profile:', error);
            this.error.set(error.message || 'Failed to load profile');
            this.isLoading.set(false);
          },
        });
      return;
    }

    // Loading another user's profile
    this.userService
      .findUserByUsername(username)
      .pipe(
        switchMap((user) => {
          if (!user) throw new Error('User not found');

          // Check if viewing own profile
          if (this.isLoggedIn()) {
            this.authService.currentUser$
              .pipe(take(1))
              .subscribe((currentUser) => {
                this.isCurrentUser.set(user._id === currentUser?.sub);
              });
          }

          return forkJoin({
            profile: this.userService.getUserProfile(user._id),
            stats: this.userService.getUserStats(user._id),
            tags: this.userService.getUserPreferredTags(user._id),
            posts: this.userService.getUserPosts(user._id),
          });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ profile, stats, tags, posts }) => {
          this.userProfile.set(profile);
          this.userStats.set(stats);
          this.userTags.set(tags);
          this.userPosts.set(Array.isArray(posts) ? posts : posts.posts || []);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading profile:', error);
          this.error.set(error.message || 'Failed to load profile');
          this.isLoading.set(false);
        },
      });
  }

  getExcerpt(content: string, maxLength: number = 150): string {
    const plainText = content.replace(/<[^>]*>?/gm, '');
    if (plainText.length <= maxLength) return plainText;
    const lastSpace = plainText.substring(0, maxLength).lastIndexOf(' ');
    return `${plainText.substring(
      0,
      lastSpace > 0 ? lastSpace : maxLength
    )}...`;
  }

  hasUserLiked(blog: BlogPostType): boolean {
    if (!this.isLoggedIn()) return false;
    const user = localStorage.getItem('user');
    if (!user) return false;
    const userId = JSON.parse(user).sub;
    return blog.likes.includes(userId);
  }

  toggleLike(blog: BlogPostType, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.isLoggedIn()) {
      this.toastService.show('Please sign in to like posts', 'error');
      return;
    }

    // Simple check if the user already liked this post
    const user = localStorage.getItem('user');
    if (!user) return;

    const userId = JSON.parse(user).sub;
    const hasLiked = blog.likes.includes(userId);

    if (hasLiked) {
      this.blogService.unlikeBlog(blog._id).subscribe({
        next: (updatedBlog) => {
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

  hasSocialLinks(socials?: any): boolean {
    if (!socials) return false;
    return Object.values(socials).some((value) => value);
  }
}
