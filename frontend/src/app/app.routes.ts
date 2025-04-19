import { Routes } from '@angular/router';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { SignInComponent } from './pages/sign-in/sign-in.component';
import { BlogComposeComponent } from './pages/blog-compose/blog-compose.component';
import { onboardingGuard } from './guards/onboarding.guard';
import { onboardingCompletedGuard } from './guards/onboarding-completed.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [onboardingCompletedGuard],
    loadChildren: () =>
      import('./pages/protected/protected.module').then(
        (m) => m.ProtectedModule
      ),
  },
  {
    path: 'compose',
    component: BlogComposeComponent,
    canActivate: [onboardingCompletedGuard],
  },
  {
    path: 'settings',
    loadChildren: () =>
      import('./pages/settings/settings.module').then((m) => m.SettingsModule),
    canActivate: [onboardingCompletedGuard],
  },
  { path: 'signup', component: SignUpComponent },
  { path: 'signin', component: SignInComponent },
  {
    path: 'onboarding',
    loadChildren: () =>
      import('./pages/onboarding/onboarding.module').then(
        (m) => m.OnboardingModule
      ),
    canActivate: [onboardingGuard],
  },
  // Default fallback route
  { path: '**', redirectTo: '/' },
];
