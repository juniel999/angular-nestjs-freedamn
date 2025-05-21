import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { publicOnlyGuard } from './guards/public-only.guard';
import { BlogAuthorGuard } from './guards/blog-author.guard';
import { onboardingGuard } from './guards/onboarding.guard';
import { onboardingCompletedGuard } from './guards/onboarding-completed.guard';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'compose',
        loadComponent: () =>
          import('./pages/blog-compose/blog-compose.component').then(
            (m) => m.BlogComposeComponent
          ),
        canActivate: [authGuard, onboardingCompletedGuard],
      },
      {
        path: 'blogs/:idOrSlug',
        loadComponent: () =>
          import('./pages/view-blog/view-blog.component').then(
            (m) => m.ViewBlogComponent
          ),
      },
      {
        path: 'blogs/:idOrSlug/edit',
        loadComponent: () =>
          import('./pages/blog-compose/blog-compose.component').then(
            (m) => m.BlogComposeComponent
          ),
        canActivate: [authGuard, BlogAuthorGuard, onboardingCompletedGuard],
      },
      {
        path: 'profile/:username',
        loadComponent: () =>
          import('./pages/profile/profile.component').then(
            (m) => m.ProfileComponent
          ),
        canActivate: [onboardingCompletedGuard],
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.component').then(
            (m) => m.ProfileComponent
          ),
        canActivate: [authGuard, onboardingCompletedGuard],
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./pages/settings/settings.module').then(
            (m) => m.SettingsModule
          ),
        canActivate: [authGuard, onboardingCompletedGuard],
      },
    ],
  },
  {
    path: 'signin',
    loadComponent: () =>
      import('./pages/sign-in/sign-in.component').then(
        (m) => m.SignInComponent
      ),
    canActivate: [publicOnlyGuard],
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/sign-up/sign-up.component').then(
        (m) => m.SignUpComponent
      ),
    canActivate: [publicOnlyGuard],
  },
  {
    path: 'onboarding',
    loadChildren: () =>
      import('./pages/onboarding/onboarding.module').then(
        (m) => m.OnboardingModule
      ),
    canActivate: [authGuard, onboardingGuard],
  },
  { path: '**', redirectTo: '/' },
];
