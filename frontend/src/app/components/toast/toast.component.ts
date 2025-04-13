import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './toast.component.html',
})
export class ToastComponent implements OnInit {
  @Input() message: string = '';
  @Input() type: 'success' | 'error' = 'success';
  @Input() duration: number = 3000;

  getAlertClass(): string {
    return this.type === 'success' ? 'bg-primary text-black' : 'bg-error text-black';
  }

  ngOnInit() {
    // Automatically remove the toast after the specified duration
    setTimeout(() => {
      const element = document.querySelector('app-toast');
      if (element) {
        element.remove();
      }
    }, this.duration);
  }
} 