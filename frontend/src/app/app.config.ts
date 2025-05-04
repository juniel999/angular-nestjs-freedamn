import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { initializeIcons } from './icons';
import {
  provideHttpClient,
  withInterceptors,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { routes } from './app.routes';
import { QUILL_CONFIG_TOKEN } from 'ngx-quill';

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
    {
      provide: QUILL_CONFIG_TOKEN,
      useValue: {
        format: 'html',
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ header: 1 }, { header: 2 }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ script: 'sub' }, { script: 'super' }],
            [{ indent: '-1' }, { indent: '+1' }],
            [{ direction: 'rtl' }],
            [{ size: ['small', false, 'large', 'huge'] }],
            [{ header: [1, 2, 3, 4, 5, 6, false] }],
            [{ color: [] }, { background: [] }],
            [{ font: [] }],
            [{ align: [] }],
            ['clean'],
            ['link', 'image', 'video'],
          ],
        },
      },
    },
  ],
};
