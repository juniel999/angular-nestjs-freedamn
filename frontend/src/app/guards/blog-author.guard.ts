import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, switchMap, map, of } from 'rxjs';
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

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const blogId = route.paramMap.get('id');

    if (!blogId) {
      this.router.navigate(['/']);
      return of(false);
    }

    return this.blogService.getBlogById(blogId).pipe(
      switchMap((blog) =>
        this.authService.currentUser$.pipe(
          map((user) => {
            const isAuthor = blog.author?._id === user?.sub;
            if (!isAuthor) {
              this.router.navigate(['/']);
            }
            return isAuthor;
          })
        )
      )
    );
  }
}
