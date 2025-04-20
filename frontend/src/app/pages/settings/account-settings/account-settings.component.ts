import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
export class AccountSettingsComponent {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  accountForm!: FormGroup;
  readonly currentUser = toSignal(this.authService.currentUser$);
  isLoading: boolean = false;
  isSaving = signal(false);
  showCurrentPassword: boolean = false;
  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;

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

    const user = this.currentUser();
    if (!user?.sub) {
      this.toastService.show('Please log in to change password', 'error');
      return;
    }

    this.isSaving.set(true);
    const { currentPassword, newPassword } = this.accountForm.value;

    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: (response) => {
        this.toastService.show(response.message, 'success');
        this.accountForm.reset({
          username: user.username,
          email: user.email,
        });
        this.isSaving.set(false);
      },
      error: (error) => {
        const errorMessage =
          error?.error?.message || 'Failed to update password';
        this.toastService.show(errorMessage, 'error');
        this.isSaving.set(false);
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
