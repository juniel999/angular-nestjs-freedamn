import { Component, Input } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  @Input() isLoggedIn: boolean = true;
  
  username: string = 'Sample User';
  userAvatar: string = 'https://i.pravatar.cc/150?img=31'; // Using a random avatar
}
