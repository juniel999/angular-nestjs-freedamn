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
      // return to login page if not logged in
      this.router.navigate(['/signin']);
      this.toastService.show('Please sign in to like posts', 'error');
      return;
    }
    this.onLikeClick(blog, event);
  }

  getExcerpt(html: string): string {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    if (plainText.length <= 150) return plainText;
    const lastSpace = plainText.substring(0, 150).lastIndexOf(' ');
    return `${plainText.substring(0, lastSpace > 0 ? lastSpace : 150)}...`;
  }

  formatTimeAgo(dateString: string): string {
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
}
