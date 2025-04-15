import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface LoginResponse {
  access_token: string;
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
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:3000/api';
  private readonly tokenKey = 'freedamn_token';
  private readonly currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();
  
  constructor(private readonly http: HttpClient) {
    this.initializeAuthentication();
  }

  /**
   * Initialize authentication state from storage
   */
  private initializeAuthentication(): void {
    this.loadUserFromStorage();
  }

  /**
   * Authenticate user with credentials
   */
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { username, password })
      .pipe(
        tap(response => {
          this.saveToken(response.access_token);
          this.loadUserFromStorage();
        })
      );
  }

  /**
   * Register a new user account
   */
  register(userData: RegisterRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/register`, userData);
  }

  /**
   * Log out the current user
   */
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
  }

  /**
   * Check if user is currently logged in
   */
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  /**
   * Get the user's profile data
   */
  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/auth/profile`);
  }

  /**
   * Get the current authentication token
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Save authentication token to storage
   */
  private saveToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  /**
   * Load user data from storage (JWT token)
   */
  private loadUserFromStorage(): void {
    const token = this.getToken();
    if (!token) return;
    
    try {
      // Parse user info from JWT token (basic info only)
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Check if token is expired
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      if (expiryTime && Date.now() >= expiryTime) {
        console.log('Token expired. Logging out user.');
        this.logout();
        return;
      }
      
      // Extract only the essential user properties
      const userProfile: UserProfile = {
        username: payload.username,
        sub: payload.sub,
        roles: payload.roles,
      };
      
      this.currentUserSubject.next(userProfile);
    } catch (error) {
      console.error('Invalid token format', error);
      this.logout();
    }
  }
} 