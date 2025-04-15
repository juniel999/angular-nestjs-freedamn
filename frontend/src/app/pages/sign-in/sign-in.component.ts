import { Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, Validators, FormControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [ReactiveFormsModule, FontAwesomeModule, RouterModule],
  templateUrl: './sign-in.component.html',
})
export class SignInComponent {
  signInForm = new FormGroup({
    username: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    password: new FormControl('', { validators: [Validators.required], nonNullable: true }),
  });
  
  showPassword = false;
  errorMessage: string | null = null;
  isLoading = false;
  
  constructor(
    private router: Router, 
    private authService: AuthService,
    private toastService: ToastService,
  ) {}

  get formControls() {
    return this.signInForm.controls;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.signInForm.valid) {
      this.isLoading = true;
      const username = this.signInForm.value.username ?? '';
      const password = this.signInForm.value.password ?? '';
      
      this.authService.login(username, password).subscribe({
        next: (res) => {
          console.log('Login successful', res);
          this.toastService.show(
            'Login successful! Welcome back.',
            'success'
          );
          
          // Navigate to home after a short delay
          setTimeout(() => {
            this.isLoading = false;
            this.router.navigate(['/']);
          }, 1500);
        },
        error: (error) => {
          console.error('Login failed', error);
          this.errorMessage = error.error?.message || 'Invalid credentials';
          this.toastService.show(
            `Login failed: ${this.errorMessage}`,
            'error'
          );
          this.isLoading = false;
        }
      });
    } else {
      this.signInForm.markAllAsTouched();
    }
  }

  navigateToSignUp() {
    this.router.navigate(['/signup']);
  }
} 