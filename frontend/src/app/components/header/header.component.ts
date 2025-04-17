import { Component, OnInit } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FontAwesomeModule, RouterLink],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  username: string = 'Guest';
  userAvatar: string = '';
  isLoggedIn = false;
  userId = '';
  
  constructor(
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    // Just subscribe once and update the properties directly
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      this.username = user?.username || 'Guest';
      this.userId = user?.sub || "";
    });

    if(this.userId){  
      this.userService.getUserProfile(this.userId).subscribe(userProfile => {
        this.userAvatar = userProfile?.avatar || 'https://ui-avatars.com/api/?name=Guest&background=random&name='+this.username.charAt(0).toUpperCase();
      });
    }
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