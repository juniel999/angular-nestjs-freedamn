import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  imports: [FontAwesomeModule, RouterModule, HeaderComponent],
})
export class SettingsComponent implements OnInit {
  activeLink: string = 'user-info';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Update active link based on router events
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        const urlParts = url.split('/');
        this.activeLink = urlParts[urlParts.length - 1];
      });
  }
}
