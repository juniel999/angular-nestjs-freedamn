import { Component, OnInit, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';
import { AvatarUpdateService } from '../../services/avatar-update.service';

@Component({
  selector: 'app-header',
  imports: [FontAwesomeModule, RouterLink],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit {
  username = signal('');
  userAvatar = signal(localStorage.getItem('avatar') || '');
  isLoggedIn = false;
  userId = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService,
    private userService: UserService,
    private avatarUpdateService: AvatarUpdateService
  ) {
    this.avatarUpdateService.avatarUpdated$.subscribe((avatarUrl) => {
      this.userAvatar.set(avatarUrl);
    });
  }

  ngOnInit(): void {
    // Just subscribe once and update the properties directly
    this.authService.currentUser$.subscribe((user) => {
      this.isLoggedIn = !!user;
      this.username.set(user?.username || 'Guest');
      this.userId = user?.sub || '';
    });

    if (this.userId) {
      this.userService.getUserProfile(this.userId).subscribe((userProfile) => {
        this.userAvatar.set(
          userProfile?.avatar ||
            'https://ui-avatars.com/api/?name=Guest&background=E5B400&name=' +
              this.username().charAt(0).toUpperCase()
        );

        // Set the avatar in local storage
        if (!localStorage.getItem('avatar')) {
          localStorage.setItem('avatar', this.userAvatar());
        }
      });
    }
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
