import { Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, Validators, FormControl, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [ReactiveFormsModule, FontAwesomeModule, RouterModule],
  templateUrl: './sign-up.component.html',
})
export class SignUpComponent {
  signUpForm = new FormGroup({
    username: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    firstname: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    lastname: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    email: new FormControl('', { validators: [Validators.required, Validators.email], nonNullable: true }),
    password: new FormControl('', { validators: [Validators.required, Validators.minLength(8)], nonNullable: true }),
    confirmPassword: new FormControl('', { validators: [Validators.required], nonNullable: true })
  }, { validators: SignUpComponent.passwordMatchValidator });
  
  showPassword = false;
  showConfirmPassword = false;
  errorMessage: string | null = null;
  
  constructor(
    private router: Router, 
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  get formControls() {
    return this.signUpForm.controls;
  }

  static passwordMatchValidator(form: AbstractControl): ValidationErrors | null {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (password === confirmPassword) {
      return null;
    }
    
    return { passwordMismatch: true };
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit() {
    if (this.signUpForm.valid) {
      console.log('Form submitted successfully', this.signUpForm.value);
      // Here you would call your auth service to register the user
      // this.authService.register(this.signUpForm.value).subscribe(...);
      this.authService.register({
        username: this.signUpForm.value.username ?? "",
        email: this.signUpForm.value.email ?? ""  ,
        password: this.signUpForm.value.password ?? "",
        firstName: this.signUpForm.value.firstname ?? "",
        lastName: this.signUpForm.value.lastname ?? ""
      } ).subscribe({
        next: (res) => {
          console.log('Registration successful', res);
          // Show toast notification with primary color
          this.toastService.show(
            'Registration successful! Welcome to freedamn.',
            'success'
          );
          
          // Navigate to home after a short delay
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 1500);
        },
        error: (error) => {
          console.error('Registration failed', error);
          this.errorMessage = error.error.message;
          this.toastService.show(
            `Registration failed: ${error.error.message}`,
            'error'
          );
        }
      })
    } else {
      this.signUpForm.markAllAsTouched();
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}