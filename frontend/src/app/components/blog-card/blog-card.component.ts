import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { BlogPostType } from '../../types/blog-post.type';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-blog-card',
  templateUrl: './blog-card.component.html',
  imports: [RouterLink, FontAwesomeModule],
})
export class BlogCardComponent {
  @Input() blog: BlogPostType = {} as BlogPostType;
  @Input() hasUserLiked: (blog: BlogPostType) => boolean = () => false;
  @Input() onLikeClick: (blog: BlogPostType, event: Event) => void = () => {};

  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  isLoggedIn = false;

  ngOnInit() {
    this.authService.currentUser$.subscribe((user) => {
      this.isLoggedIn = !!user;
    });
  }

  onLikeButtonClick(blog: BlogPostType, event: Event) {
    if (!this.isLoggedIn) {
      event.preventDefault();
      event.stopPropagation();
      this.toastService.show('Please sign in to like posts', 'error');
      return;
    }
    this.onLikeClick(blog, event);
  }

  getExcerpt(content: string): string {
    // Strip HTML tags
    const plainText = content.replace(/<[^>]*>?/gm, '');
    const maxLength = 150;

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

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;

    const years = Math.floor(months / 12);
    return `${years}y ago`;
  }
}
