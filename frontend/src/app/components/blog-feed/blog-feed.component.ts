import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { BlogService, BlogPost } from '../../services/blog.service';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

type Tab = 'for-you' | 'explore' | 'following';

@Component({
  selector: 'app-blog-feed',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FontAwesomeModule],
  templateUrl: './blog-feed.component.html',
})
export class BlogFeedComponent {
  private blogService = inject(BlogService);
  private toastService = inject(ToastService);
  private userService = inject(UserService);
  private authService = inject(AuthService);

  @ViewChild('feedContainer') feedContainer!: ElementRef;

  filterOpen = false;
  filterTag = '';
  firstName: string = ''; // Default value

  // Computed properties from blog service
  loading = this.blogService.loading;
  currentTab = this.blogService.currentTab;
  currentBlogs = this.blogService.currentBlogs;
  currentFilter = this.blogService.currentFilter;

  ngOnInit() {
    // Set initial tab to "For You" and load data
    this.blogService.setActiveTab('for-you');
    this.setupInfiniteScroll();

    // Load user profile to get the first name
    this.loadUserProfile();
  }

  /**
   * Load user profile to get first name
   */
  private loadUserProfile() {
    // First check if we have the firstName in localStorage
    const storedFirstName = localStorage.getItem('firstName');
    if (storedFirstName) {
      this.firstName = storedFirstName;
      return;
    }

    // If not in localStorage, fetch from API
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.userService.getUserProfile(user.sub).subscribe({
          next: (profile) => {
            if (profile && profile.firstName) {
              this.firstName = profile.firstName;
              localStorage.setItem('firstName', profile.firstName);
            }
          },
          error: (error) => {
            console.error('Error loading user profile:', error);
          },
        });
      }
    });
  }

  /**
   * Switch between tabs
   */
  changeTab(tab: Tab) {
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
    if (event.key === 'Enter' && this.filterTag.trim()) {
      this.blogService.setFilter(this.filterTag.trim());
      this.filterOpen = false;
    }
  }

  /**
   * Apply filter when user clicks button
   */
  applyFilterByButton() {
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
    // Use Intersection Observer for infinite scrolling
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5,
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !this.loading()) {
        this.loadMorePosts();
      }
    }, options);

    // Add a small delay to make sure the DOM is ready
    setTimeout(() => {
      if (this.feedContainer?.nativeElement) {
        observer.observe(this.feedContainer.nativeElement);
      }
    }, 500);
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
  toggleLike(blog: BlogPost, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    // Simple check if the user already liked this post
    const userId = localStorage.getItem('userId');
    const hasLiked = blog.likes.includes(userId || '');

    if (hasLiked) {
      this.blogService.unlikeBlog(blog._id).subscribe({
        next: (updatedBlog) => {
          // Update the blog in the local state
          this.blogService.updateBlogInState(updatedBlog);
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
  hasUserLiked(blog: BlogPost): boolean {
    const userId = localStorage.getItem('userId');
    return blog.likes.includes(userId || '');
  }

  /**
   * Format date to display time ago
   */
  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays}d ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths}mo ago`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears}y ago`;
  }

  /**
   * Get excerpt from blog content
   */
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
}
