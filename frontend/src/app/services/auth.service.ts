import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  access_token: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UserProfile {
  username: string;
  sub: string;
  roles: string[];
  email?: string;
  firstName: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private readonly tokenKey = 'freedamn_token';
  private readonly currentUserSubject = new BehaviorSubject<UserProfile | null>(
    null
  );
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    this.initializeAuthentication();
  }

  private initializeAuthentication(): void {
    this.loadUserFromStorage();
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, { username, password })
      .pipe(
        tap((response) => {
          this.saveToken(response.access_token);
          this.loadUserFromStorage();
        })
      );
  }

  register(userData: RegisterRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/register`, userData);
  }

  logout(): void {
    localStorage.clear();
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/auth/profile`);
  }

  changePassword(
    oldPassword: string,
    newPassword: string
  ): Observable<{ message: string }> {
    const payload: ChangePasswordRequest = {
      oldPassword,
      newPassword,
    };

    return this.http
      .post<{ message: string }>(`${this.apiUrl}/auth/change-password`, payload)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          throw error;
        })
      );
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private saveToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private loadUserFromStorage(): void {
    const token = this.getToken();
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      const expiryTime = payload.exp * 1000;
      if (expiryTime && Date.now() >= expiryTime) {
        console.log('Token expired. Logging out user.');
        this.logout();
        return;
      }

      const userProfile: UserProfile = {
        username: payload.username,
        sub: payload.sub,
        roles: payload.roles,
        email: payload.email,
        firstName: payload.firstName,
      };

      this.currentUserSubject.next(userProfile);
    } catch (error) {
      console.error('Invalid token format', error);
      this.logout();
    }
  }
}
