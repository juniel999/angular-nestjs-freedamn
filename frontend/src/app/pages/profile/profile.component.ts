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
  imports: [FontAwesomeModule, RouterModule, SocialLinkButtonComponent, BlogCardComponent],
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
  error = signal<string | null>(null);

  defaultAvatar = 'https://ui-avatars.com/api/?background=E5B400&name=';
  defaultCoverPhoto = 'assets/images/default-cover.jpg';

  ngOnInit() {
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

    // Check if viewing own profile (no username parameter)
    if (!username) {
      this.isCurrentUser.set(true);
      const cachedProfile = localStorage.getItem('userProfile');
      const cachedStats = localStorage.getItem('userStats');
      const cachedTags = localStorage.getItem('userTags');

      // If we have all cached data, use it
      if (cachedProfile && cachedStats && cachedTags) {
        this.userProfile.set(JSON.parse(cachedProfile));
        this.userStats.set(JSON.parse(cachedStats));
        this.userTags.set(JSON.parse(cachedTags));

        // Only fetch posts as they are dynamic
        this.authService.currentUser$
          .pipe(
            take(1),
            switchMap((currentUser) => {
              if (!currentUser) throw new Error('No authenticated user found');
              return this.userService.getUserPosts(currentUser.sub);
            }),
            takeUntil(this.destroy$)
          )
          .subscribe({
            next: (posts) => {
              this.userPosts.set(
                Array.isArray(posts) ? posts : posts.posts || []
              );
              this.isLoading.set(false);
            },
            error: (error) => {
              console.error('Error loading posts:', error);
              this.isLoading.set(false);
              this.toastService.show('Failed to load posts', 'error');
            },
          });
        return;
      }
    }

    // If there's a username parameter or no cached data, fetch everything
    this.authService.currentUser$
      .pipe(
        take(1),
        switchMap((currentUser) => {
          if (!currentUser) {
            throw new Error('No authenticated user found');
          }

          if (!username) {
            // Loading current user's profile
            this.isCurrentUser.set(true);
            return forkJoin({
              profile: this.userService.getUserProfile(currentUser.sub),
              stats: this.userService.getUserStats(currentUser.sub),
              tags: this.userService.getUserPreferredTags(currentUser.sub),
              posts: this.userService.getUserPosts(currentUser.sub),
            }).pipe(
              tap(({ profile, stats, tags, posts }) => {
                // Cache the data for future use
                localStorage.setItem('userProfile', JSON.stringify(profile));
                localStorage.setItem('userStats', JSON.stringify(stats));
                localStorage.setItem('userTags', JSON.stringify(tags));
                localStorage.setItem('userPosts', JSON.stringify(posts));
              })
            );
          }

          // Loading another user's profile
          return this.userService.findUserByUsername(username).pipe(
            switchMap((user) => {
              if (!user) {
                throw new Error('User not found');
              }

              this.isCurrentUser.set(user._id === currentUser.sub);
              return forkJoin({
                profile: this.userService.getUserProfile(user._id),
                stats: this.userService.getUserStats(user._id),
                tags: this.userService.getUserPreferredTags(user._id),
                posts: this.userService.getUserPosts(user._id),
              });
            })
          );
        }),
        catchError((error) => {
          console.error('Error loading profile:', error);
          this.error.set(error.message || 'Failed to load profile');
          return of({ profile: null, stats: null, tags: [], posts: [] });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ profile, stats, tags, posts }) => {
          if (profile) {
            this.userProfile.set(profile);
          }
          this.userStats.set(stats);
          this.userTags.set(tags);
          this.userPosts.set(Array.isArray(posts) ? posts : posts.posts || []);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error in profile subscription:', error);
          this.isLoading.set(false);
          this.error.set('Failed to load profile data');
          this.toastService.show('Failed to load profile', 'error');
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
    this.authService.currentUser$.subscribe((user) => {
      const hasLiked = blog.likes.includes(user?.sub || '');

      if (hasLiked) {
        console.log('you already liked this post');
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
    });


    
  }

  hasSocialLinks(socials?: any): boolean {
    if (!socials) return false;
    return Object.values(socials).some((value) => value);
  }
}
