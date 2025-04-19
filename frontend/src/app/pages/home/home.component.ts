import { Component } from '@angular/core';
import { BlogFeedComponent } from '../../components/blog-feed/blog-feed.component';

@Component({
  selector: 'app-home',
  imports: [BlogFeedComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {}
