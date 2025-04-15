import { Component, OnInit } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FontAwesomeModule, RouterLink],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  username: string = 'Guest';
  userAvatar: string = 'https://ui-avatars.com/api/?name=Guest&background=random';
  isLoggedIn = false;
  
  constructor(
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    // Just subscribe once and update the properties directly
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      this.username = user?.username || 'Guest';
      
      // Set avatar, falling back to generated avatar
      if (user?.avatar && this.isValidAvatarUrl(user.avatar)) {
        this.userAvatar = user.avatar;
      } else {
        const initial = (this.username.charAt(0) || 'G').toUpperCase();
        this.userAvatar = `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(initial)}`;
      }
    });
  }

  // Simple URL validation for security
  private isValidAvatarUrl(url: string): boolean {
    return url.startsWith('https://') && url.length < 500;
  }

  async logout(): Promise<void> {
    try {
      this.authService.logout();
      await this.router.navigate(['/signin'], { replaceUrl: true });
    } catch (error) {
      this.toastService.show('Logout failed', 'error');
    }
  }
}

