import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  OnInit,
  OnDestroy,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { BlogService } from '../../services/blog.service';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { BlogPostType } from '../../types/blog-post.type';
import { BlogCardComponent } from '../blog-card/blog-card.component';
import { OnboardingService } from '../../services/onboarding.service';

type Tab = 'for-you' | 'explore' | 'following';

@Component({
  selector: 'app-blog-feed',
  imports: [RouterModule, FormsModule, FontAwesomeModule, BlogCardComponent],
  templateUrl: './blog-feed.component.html',
})
export class BlogFeedComponent implements OnInit, OnDestroy {
  private blogService = inject(BlogService);
  private toastService = inject(ToastService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private onboardingService = inject(OnboardingService);

  @ViewChild('feedContainer', { static: false }) feedContainer!: ElementRef;

  private observer?: IntersectionObserver;

  filterOpen = false;
  filterTag = '';
  firstName: string = '';
  isLoggedIn = false;
  isCurrentlyLiked = signal(false);

  // Computed properties from blog service
  loading = this.blogService.loading;
  currentTab = this.blogService.currentTab;
  currentBlogs = this.blogService.currentBlogs;
  currentFilter = this.blogService.currentFilter;

  ngOnInit() {
    // Check authentication status and handle tab changes
    this.authService.currentUser$.subscribe((user) => {
      const wasLoggedIn = this.isLoggedIn;
      this.isLoggedIn = !!user;

      // Set firstName directly from JWT payload
      if (user) {
        this.firstName = user.firstName;

        if (!localStorage.getItem('userProfile')) {
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
                localStorage.setItem('userProfile', JSON.stringify(profile));
              }
            },
            error: (error) => {
              console.error('Error fetching profile', error);
            },
          });
        }

        // Only switch to for-you if we just logged in
        if (!wasLoggedIn) {
          this.blogService.setActiveTab('for-you');
        }
      } else {
        // If logged out, switch to explore
        this.blogService.setActiveTab('explore');
      }
    });

    // Setup infinite scroll
    this.setupInfiniteScroll();
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  /**
   * Switch between tabs
   */
  changeTab(tab: Tab) {
    if (!this.isLoggedIn && (tab === 'for-you' || tab === 'following')) {
      this.toastService.show(
        'Please sign in to access personalized content',
        'error'
      );
      return;
    }

    this.blogService.setActiveTab(tab);
    this.filterOpen = false;
    this.filterTag = '';
  }

  /**
   * Toggle filter dropdown
   */
  toggleFilter() {
    this.filterOpen = !this.filterOpen;
    if (!this.filterOpen) {
      this.filterTag = '';
    }
  }

  /**
   * Apply filter when user presses enter
   */
  applyFilter(event: KeyboardEvent) {
    if (!this.isLoggedIn) {
      this.toastService.show('Please sign in to use filters', 'error');
      return;
    }

    if (event.key === 'Enter' && this.filterTag.trim()) {
      this.blogService.setFilter(this.filterTag.trim());
      this.filterOpen = false;
    }
  }

  /**
   * Apply filter when user clicks button
   */
  applyFilterByButton() {
    if (!this.isLoggedIn) {
      this.toastService.show('Please sign in to use filters', 'error');
      return;
    }

    if (this.filterTag.trim()) {
      this.blogService.setFilter(this.filterTag.trim());
      this.filterOpen = false;
    }
  }

  /**
   * Clear current filter
   */
  clearFilter() {
    this.filterTag = '';
    this.blogService.setFilter(null);
  }

  /**
   * Set up infinite scrolling
   */
  private setupInfiniteScroll() {
    const options = {
      root: null,
      rootMargin: '20px',
      threshold: 0.1,
    };

    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !this.loading()) {
        this.loadMorePosts();
      }
    }, options);

    // Re-observe the container whenever it changes
    const setupObserver = () => {
      if (this.feedContainer?.nativeElement) {
        this.observer?.observe(this.feedContainer.nativeElement);
      }
    };

    // Use mutation observer to watch for container changes
    const mutationObserver = new MutationObserver(() => {
      if (this.feedContainer?.nativeElement) {
        setupObserver();
        // Don't disconnect the mutation observer as the container might change again
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Load more posts when user scrolls to bottom
   */
  loadMorePosts() {
    this.blogService.loadMore();
  }

  /**
   * Like or unlike a blog post
   */
  toggleLike(blog: BlogPostType, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    console.log(this.isCurrentlyLiked());

    if (!this.isLoggedIn) {
      this.toastService.show('Please sign in to like posts', 'error');
      return;
    }

    const user = localStorage.getItem('userProfile');
    if (!user) return;

    const userId = JSON.parse(user).id;
    const currentlyLiked = blog.likes.includes(userId);

    // Only proceed if there's a state change
    if (currentlyLiked) {
      this.blogService.unlikeBlog(blog._id).subscribe({
        next: (updatedBlog) => {
          // Update the blog in the local state
          this.blogService.updateBlogInState(updatedBlog);
          this.isCurrentlyLiked.set(false);
        },
        error: () => {
          this.toastService.show('Failed to unlike post', 'error');
        },
      });
    } else {
      this.blogService.likeBlog(blog._id).subscribe({
        next: (updatedBlog) => {
          // Update the blog in the local state
          this.blogService.updateBlogInState(updatedBlog);
          this.isCurrentlyLiked.set(true);
        },
        error: () => {
          this.toastService.show('Failed to like post', 'error');
        },
      });
    }
  }

  /**
   * Check if the current user has liked a blog
   */
  hasUserLiked(blog: BlogPostType): boolean {
    if (!this.isLoggedIn) return false;
    const user = localStorage.getItem('userProfile');
    if (!user) return false;
    const userId = JSON.parse(user).id;
    return blog.likes.includes(userId);
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
