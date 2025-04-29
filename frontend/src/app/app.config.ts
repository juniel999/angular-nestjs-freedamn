import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import {
  provideRouter,
  withViewTransitions,
  withInMemoryScrolling,
} from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { initializeIcons } from './icons';
import {
  provideHttpClient,
  withInterceptors,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';

import { routes } from './app.routes';

// HTTP interceptor function
const authInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  // Access token directly from localStorage instead of injecting AuthService
  const token = localStorage.getItem('freedamn_token');

  if (token && !req.url.includes('/login') && !req.url.includes('/register')) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(authReq);
  }

  return next(req);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      // withViewTransitions(),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      })
    ),
    provideHttpClient(withInterceptors([authInterceptorFn])),
    {
      provide: FaIconLibrary,
      useFactory: () => {
        const library = new FaIconLibrary();
        initializeIcons(library);
        return library;
      },
    },
  ],
};
