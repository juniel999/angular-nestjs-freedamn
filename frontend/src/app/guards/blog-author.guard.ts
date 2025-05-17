import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, switchMap, map, of, catchError } from 'rxjs';
import { BlogService } from '../services/blog.service';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class BlogAuthorGuard implements CanActivate {
  constructor(
    private blogService: BlogService,
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const idOrSlug = route.paramMap.get('idOrSlug');
    if (!idOrSlug) {
      this.router.navigate(['/']);
      return of(false);
    }

    return this.blogService.getBlogById(idOrSlug).pipe(
      switchMap((blog) => {
        return this.authService.currentUser$.pipe(
          map((user) => {
            if (!user || blog.author._id !== user.sub) {
              this.router.navigate(['/']);
              return false;
            }
            return true;
          })
        );
      }),
      catchError(() => {
        this.router.navigate(['/']);
        return of(false);
      })
    );
  }
}
