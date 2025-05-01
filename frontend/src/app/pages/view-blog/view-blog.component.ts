import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { BlogService } from '../../services/blog.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { BlogPostType } from '../../types/blog-post.type';

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

  blog = signal<BlogPostType | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  isLoggedIn = signal(false);

  ngOnInit() {
    // Check authentication status
    this.authService.currentUser$.subscribe((user) => {
      this.isLoggedIn.set(!!user);
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
        this.blog.set(blog);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading blog:', error);
        this.error.set(error.message || 'Failed to load blog post');
        this.isLoading.set(false);
      },
    });
  }

  hasUserLiked(): boolean {
    if (!this.isLoggedIn() || !this.blog()) return false;
    const user = localStorage.getItem('user');
    if (!user) return false;
    const userId = JSON.parse(user).sub;
    return this.blog()!.likes.includes(userId);
  }

  toggleLike() {
    if (!this.isLoggedIn()) {
      this.toastService.show('Please sign in to like posts', 'error');
      return;
    }

    const blog = this.blog();
    if (!blog) return;

    if (this.hasUserLiked()) {
      this.blogService.unlikeBlog(blog._id).subscribe({
        next: (updatedBlog) => {
          this.blog.set(updatedBlog);
        },
        error: () => {
          this.toastService.show('Failed to unlike post', 'error');
        },
      });
    } else {
      this.blogService.likeBlog(blog._id).subscribe({
        next: (updatedBlog) => {
          this.blog.set(updatedBlog);
        },
        error: () => {
          this.toastService.show('Failed to like post', 'error');
        },
      });
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
