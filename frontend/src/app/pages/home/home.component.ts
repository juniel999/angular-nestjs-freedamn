import { Component } from '@angular/core';
import { HeaderComponent } from "../../components/header/header.component";
import { BlogFeedComponent } from "../../components/blog-feed/blog-feed.component";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeaderComponent, BlogFeedComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  
}