import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { BlogPostType } from '../../types/blog-post.type';

@Component({
  selector: 'app-blog-card',
  templateUrl: './blog-card.component.html',
  imports: [RouterLink, FontAwesomeModule]
})
export class BlogCardComponent {
    // blog must be required
    // add an initial value of blog.comments to avoid undefined error in the template
  @Input() blog: BlogPostType = {} as BlogPostType;
  @Input() hasUserLiked: (blog: BlogPostType) => boolean = () => false;
  @Input() onLikeClick: (blog: BlogPostType, event: Event) => void = () => {};

  getExcerpt(content: string): string {
    if (!content) return '';
    return content.slice(0, 150) + (content.length > 150 ? '...' : '');
  }
}