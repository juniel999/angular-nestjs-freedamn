import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, of, take, tap, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { TagData } from '../types/tag.type';

export interface ProfileData {
  firstName?: string;
  lastName?: string;
  pronouns?: string;
  title?: string;
  location?: string;
  birthdate?: string;
  bio?: string;
  avatar?: string;
  coverphoto?: string;
  socials?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class OnboardingService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  /**
   * Get the current user ID or use the provided one
   * @param userId Optional user ID
   * @returns Observable with the user ID
   */
  private getUserId(userId?: string): Observable<string> {
    if (userId) {
      return of(userId);
    }

    return this.authService.currentUser$.pipe(
      take(1),
      switchMap((user) => {
        if (!user) {
          throw new Error('No authenticated user found');
        }
        return of(user.sub);
      })
    );
  }

  getOnboardingStatus(userId?: string): Observable<{ completed: boolean }> {
    return this.getUserId(userId).pipe(
      switchMap((id) =>
        this.http.get<{ completed: boolean }>(
          `${this.apiUrl}/users/${id}/onboarding-status`
        )
      )
    );
  }

  getUserProfile(userId?: string): Observable<ProfileData> {
    return this.getUserId(userId).pipe(
      switchMap((id) =>
        this.http.get<ProfileData>(`${this.apiUrl}/users/${id}/profile`)
      )
    );
  }

  updateUserProfile(
    userId?: string,
    profileData?: ProfileData
  ): Observable<ProfileData> {
    return this.getUserId(userId).pipe(
      switchMap((id) =>
        this.http.patch<ProfileData>(
          `${this.apiUrl}/users/me/profile`,
          profileData
        )
      )
    );
  }

  uploadAvatar(userId?: string, file?: File): Observable<{ url: string }> {
    if (!file) {
      throw new Error('No file provided for upload');
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.getUserId(userId).pipe(
      switchMap((id) =>
        this.http.post<{ url: string }>(
          `${this.apiUrl}/users/${id}/avatar`,
          formData
        )
      )
    );
  }

  uploadCoverPhoto(userId?: string, file?: File): Observable<{ url: string }> {
    if (!file) {
      throw new Error('No file provided for upload');
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.getUserId(userId).pipe(
      switchMap((id) =>
        this.http.post<{ url: string }>(
          `${this.apiUrl}/users/${id}/cover-photo`,
          formData
        )
      )
    );
  }

  getAvailableTags(): Observable<TagData[]> {
    return this.http.get<TagData[]>(`${this.apiUrl}/tags`);
  }

  /**
   * Create tags if they don't already exist
   * @param tags Array of tag names to create
   * @returns Observable with the created tags
   */
  addTagsIfNotExist(tags: string[]): Observable<TagData[]> {
    return this.http.post<TagData[]>(`${this.apiUrl}/tags/bulk`, { tags });
  }

  updateUserTags(
    userId?: string,
    tags?: string[]
  ): Observable<{ tags: string[] }> {
    console.log('updateUserTags called with tags:', tags);

    // Make sure we have a valid array of tags
    const validTags =
      tags?.filter(
        (tag) => tag !== null && tag !== undefined && tag.trim() !== ''
      ) || [];
    console.log('Valid tags after filtering:', validTags);

    return this.getUserId(userId).pipe(
      switchMap((id) => {
        console.log(`Sending tags update request for user ${id}:`, validTags);
        return this.http
          .post<{ tags: string[] }>(`${this.apiUrl}/users/${id}/tags`, {
            tags: validTags,
          })
          .pipe(
            tap((response) => console.log('Tags update response:', response))
          );
      })
    );
  }

  completeOnboarding(userId?: string): Observable<{ completed: boolean }> {
    return this.getUserId(userId).pipe(
      switchMap((id) =>
        this.http.post<{ completed: boolean }>(
          `${this.apiUrl}/users/${id}/complete-onboarding`,
          {}
        )
      )
    );
  }

  /**
   * Get the user's preferred tags
   * @param userId Optional user ID
   * @returns Observable with the user's preferred tags
   */
  getUserTags(userId?: string): Observable<{ tags: string[] }> {
    return this.getUserId(userId).pipe(
      switchMap((id) =>
        this.http.get<{ tags: string[] }>(`${this.apiUrl}/users/${id}/tags`)
      )
    );
  }

  /**
   * Get popular tags sorted by usage count
   * @param limit Maximum number of tags to return
   * @returns Observable with popular tags
   */
  getPopularTags(limit: number = 10): Observable<TagData[]> {
    return this.getAvailableTags().pipe(
      map((tags) => {
        // Sort tags by usageCount if available, otherwise return unsorted
        return tags
          .filter((tag) => tag.usageCount !== undefined) // Filter out tags without usageCount
          .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)) // Sort by usageCount desc
          .slice(0, limit); // Limit to specified number
      })
    );
  }
}
