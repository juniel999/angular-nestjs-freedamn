import { Component, OnInit, inject } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  standalone: true,
  imports: [FontAwesomeModule, RouterModule, CommonModule],
})
export class SettingsComponent implements OnInit {
  window = window;
  activeLink: string = 'user-info';
  isMenuOpen: boolean = false;

  navItems = [
    { id: 'user-info', label: 'User Info', icon: 'user', route: './user-info' },
    {
      id: 'socials',
      label: 'Social Links',
      icon: 'link',
      route: './socials',
    },
    {
      id: 'topics-tags',
      label: 'Topics & Tags',
      icon: 'hashtag',
      route: './topics-tags',
    },
    {
      id: 'avatar-cover',
      label: 'Avatar & Cover',
      icon: 'file-image',
      route: './avatar-cover',
    },
    {
      id: 'account',
      label: 'Account Settings',
      icon: 'cog',
      route: './account',
    },
  ];

  private router = inject(Router);

  ngOnInit(): void {
    // Update active link based on router events
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        const urlParts = url.split('/');
        this.activeLink = urlParts[urlParts.length - 1];

        // Close menu when route changes on mobile
        if (window.innerWidth < 768) {
          this.isMenuOpen = false;
        }
      });

    // Initialize menu state based on screen size
    this.isMenuOpen = window.innerWidth >= 768;
  }
}
