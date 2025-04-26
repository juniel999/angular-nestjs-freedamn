import { Routes } from '@angular/router';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { SignInComponent } from './pages/sign-in/sign-in.component';
import { BlogComposeComponent } from './pages/blog-compose/blog-compose.component';
import { onboardingGuard } from './guards/onboarding.guard';
import { onboardingCompletedGuard } from './guards/onboarding-completed.guard';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { publicOnlyGuard } from './guards/public-only.guard';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        component: HomeComponent, // Direct component reference for public access
      },
      {
        path: 'compose',
        component: BlogComposeComponent,
        canActivate: [onboardingCompletedGuard],
      },
      {
        path: 'profile/:username',
        component: ProfileComponent,
        canActivate: [onboardingCompletedGuard],
      },
      {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [onboardingCompletedGuard],
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./pages/settings/settings.module').then(
            (m) => m.SettingsModule
          ),
        canActivate: [onboardingCompletedGuard],
      },
    ],
  },
  {
    path: 'signup',
    component: SignUpComponent,
    canActivate: [publicOnlyGuard],
  },
  {
    path: 'signin',
    component: SignInComponent,
    canActivate: [publicOnlyGuard],
  },
  {
    path: 'onboarding',
    loadChildren: () =>
      import('./pages/onboarding/onboarding.module').then(
        (m) => m.OnboardingModule
      ),
    canActivate: [onboardingGuard],
  },
  { path: '**', redirectTo: '/' },
];
