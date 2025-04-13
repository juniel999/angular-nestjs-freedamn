import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Freedamn | Home';
  isUserLoggedIn = false; // Toggle this to test different header states
  
  toggleLoginState() {
    this.isUserLoggedIn = !this.isUserLoggedIn;
  }
}
