import { Component, Input } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-social-link-button',
  standalone: true,
  imports: [FontAwesomeModule],
  template: `
    <a
      [href]="link"
      target="_blank"
      class="btn btn-accent btn-sm hover:text-primary"
    >
      @if (!isWebsite) {
      <fa-icon [icon]="['fab', icon]"></fa-icon>
      } @if (isWebsite) {
      <fa-icon [icon]="['fas', 'globe']"></fa-icon>
      }
      {{ label }}
      <fa-icon
        [icon]="['fas', 'arrow-up-right-from-square']"
        class="ml-1 text-xs opacity-80"
      ></fa-icon>
    </a>
  `,
})
export class SocialLinkButtonComponent {
  @Input() link: string = '';
  @Input() icon: string = '';
  @Input() label: string = '';
  @Input() isWebsite: boolean = false;
}
