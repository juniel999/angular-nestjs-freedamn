import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { UserType } from '../types/user.type';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  getUserProfile(userId: string): Observable<UserType | null> {
    return this.http.get<UserType>(`${this.apiUrl}/users/${userId}/profile`);
  }
}
