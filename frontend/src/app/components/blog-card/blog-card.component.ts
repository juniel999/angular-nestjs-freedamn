import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { BlogPostType } from '../../types/blog-post.type';

@Component({
  selector: 'app-blog-card',
  templateUrl: './blog-card.component.html',
  imports: [RouterLink, FontAwesomeModule],
})
export class BlogCardComponent {
  @Input() blog: BlogPostType = {} as BlogPostType;
  @Input() hasUserLiked: (blog: BlogPostType) => boolean = () => false;
  @Input() onLikeClick: (blog: BlogPostType, event: Event) => void = () => {};

  getExcerpt(content: string): string {
    if (!content) return '';
    return content.slice(0, 150) + (content.length > 150 ? '...' : '');
  }

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Less than a minute
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    }

    // Less than an hour
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }

    // Less than a day
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }

    // After 24 hours, show the actual date and time
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
