import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { BlogService } from '../../services/blog.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { BlogPostType } from '../../types/blog-post.type';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface ExtendedBlogPost extends BlogPostType {
  safeHtml: SafeHtml;
}

@Component({
  selector: 'app-view-blog',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, RouterModule],
  templateUrl: './view-blog.component.html',
})
export class ViewBlogComponent {
  private blogService = inject(BlogService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private sanitizer = inject(DomSanitizer);

  blog = signal<ExtendedBlogPost | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  isLoggedIn = signal(false);
  userId = signal<string>('');

  ngOnInit() {
    // Check authentication status
    this.authService.currentUser$.subscribe((user) => {
      this.isLoggedIn.set(!!user);
      this.userId.set(user ? user.sub : '');
    });

    // Get blog ID from route params and load blog
    const blogId = this.route.snapshot.paramMap.get('id');
    if (!blogId) {
      this.error.set('Blog post not found');
      this.isLoading.set(false);
      return;
    }

    this.loadBlog(blogId);
  }

  private loadBlog(id: string) {
    this.blogService.getBlogById(id).subscribe({
      next: (blog) => {
        // Add sanitized HTML content
        const extendedBlog: ExtendedBlogPost = {
          ...blog,
          safeHtml: this.sanitizer.bypassSecurityTrustHtml(blog.contentHtml),
        };
        this.blog.set(extendedBlog);
        console.log(extendedBlog);
        console.log(this.userId());
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading blog:', error);
        this.error.set(error.message || 'Failed to load blog post');
        this.isLoading.set(false);
      },
    });
  }

  toggleLike() {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/signin']);
      this.toastService.show('Please sign in to like posts', 'error');
      return;
    }

    const blog = this.blog();
    if (!blog) return;

    const user = localStorage.getItem('userProfile');
    if (!user) return;

    const userId = JSON.parse(user).id;
    const currentlyLiked = blog.likes.includes(userId);

    // Only proceed if there's a state change
    if (currentlyLiked) {
      this.blogService.unlikeBlog(blog._id).subscribe({
        next: (updatedBlog) => {
          this.blog.set({
            ...updatedBlog,
            safeHtml: this.sanitizer.bypassSecurityTrustHtml(
              updatedBlog.contentHtml
            ),
          });
        },
        error: () => {
          this.toastService.show('Failed to unlike post', 'error');
        },
      });
    } else {
      this.blogService.likeBlog(blog._id).subscribe({
        next: (updatedBlog) => {
          this.blog.set({
            ...updatedBlog,
            safeHtml: this.sanitizer.bypassSecurityTrustHtml(
              updatedBlog.contentHtml
            ),
          });
        },
        error: () => {
          this.toastService.show('Failed to like post', 'error');
        },
      });
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 120) return 'Just now.';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago.`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago.`;

    // For dates beyond a day, return formatted date
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  openDeleteModal() {
    const modal = document.getElementById(
      'delete_confirm_modal'
    ) as HTMLDialogElement;
    modal.showModal();
  }

  closeDeleteModal() {
    const modal = document.getElementById(
      'delete_confirm_modal'
    ) as HTMLDialogElement;
    modal.close();
  }

  confirmDelete() {
    if (!this.blog()) return;

    this.blogService.deleteBlog(this.blog()?._id!).subscribe({
      next: () => {
        this.toastService.show('Blog post deleted successfully');
        this.router.navigate(['/']);
      },
      error: () => {
        this.toastService.show('Failed to delete blog post', 'error');
      },
      complete: () => {
        this.closeDeleteModal();
      },
    });
  }
}
