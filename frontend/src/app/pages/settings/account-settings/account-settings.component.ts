import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { take } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.component.html',
  imports: [FontAwesomeModule, ReactiveFormsModule, CommonModule],
})
export class AccountSettingsComponent implements OnInit {
  accountForm!: FormGroup;
  isLoading: boolean = false;
  isSaving: boolean = false;
  showCurrentPassword: boolean = false;
  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadUserData();
  }

  initForm(): void {
    this.accountForm = this.fb.group(
      {
        username: [{ value: '', disabled: true }],
        email: [{ value: '', disabled: true }],
        currentPassword: ['', [Validators.required]],
        newPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            this.passwordStrengthValidator,
          ],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  loadUserData(): void {
    this.isLoading = true;
    this.authService.currentUser$.pipe(take(1)).subscribe({
      next: (user) => {
        if (user) {
          this.accountForm.patchValue({
            username: user.username,
            email: user.email,
          });
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user data', error);
        this.toastService.show('Failed to load account information', 'error');
        this.isLoading = false;
      },
    });
  }

  togglePasswordVisibility(field: string): void {
    if (field === 'currentPassword') {
      this.showCurrentPassword = !this.showCurrentPassword;
    } else if (field === 'newPassword') {
      this.showNewPassword = !this.showNewPassword;
    } else if (field === 'confirmPassword') {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  changePassword(): void {
    if (this.accountForm.invalid) {
      return;
    }

    this.isSaving = true;

    const { currentPassword, newPassword } = this.accountForm.value;

    // This would connect to your backend API
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.toastService.show('Password updated successfully', 'success');
        this.accountForm.patchValue({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        this.accountForm.markAsPristine();
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Error changing password', error);

        // Handle specific error cases
        if (error.status === 401) {
          this.toastService.show('Current password is incorrect', 'error');
        } else {
          this.toastService.show('Failed to update password', 'error');
        }

        this.isSaving = false;
      },
    });
  }

  // Password validation
  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value;

    if (!password) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumeric = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(
      password
    );

    const passwordValid =
      hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar;

    return !passwordValid ? { weakPassword: true } : null;
  }

  // Password match validation
  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  // Helper method to get form control
  getFormControl(name: string): AbstractControl | null {
    return this.accountForm.get(name);
  }
}
