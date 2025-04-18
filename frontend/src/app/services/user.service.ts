import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { UserType } from '../types/user.type';
import { Observable, switchMap, of, take, map, forkJoin } from 'rxjs';
import { TagData } from './onboarding.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = environment.apiUrl;
  constructor(private http: HttpClient, private authService: AuthService) {}

  /**
   * Get the current user ID or use the provided one
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

  getUserProfile(userId: string): Observable<UserType | null> {
    return this.http.get<UserType>(`${this.apiUrl}/users/${userId}/profile`);
  }

  /**
   * Add a tag to a user's preferred tags
   * @param tagId The ID of the tag to add
   * @param userId Optional user ID (defaults to current user)
   * @returns Observable with the updated preferred tags
   */
  addPreferredTag(
    tagId: string,
    userId?: string
  ): Observable<{ tags: string[] }> {
    // First get the tag name from the ID
    return this.http.get<any>(`${this.apiUrl}/tags/${tagId}`).pipe(
      switchMap((tag) => {
        const tagName = tag.name;

        return this.getUserId(userId).pipe(
          switchMap((id) => {
            // Get the user's current tags
            return this.http
              .get<{ tags: string[] }>(`${this.apiUrl}/users/${id}/tags`)
              .pipe(
                switchMap((currentTags) => {
                  // Add the new tag if it doesn't already exist
                  let updatedTags = [...(currentTags.tags || [])];
                  if (!updatedTags.includes(tagName)) {
                    updatedTags.push(tagName);
                  }

                  // Update the user's tags
                  return this.http.post<{ tags: string[] }>(
                    `${this.apiUrl}/users/${id}/tags`,
                    { tags: updatedTags }
                  );
                })
              );
          })
        );
      })
    );
  }

  /**
   * Add multiple tags to a user's preferred tags
   * @param tagIds Array of tag IDs to add
   * @param userId Optional user ID (defaults to current user)
   * @returns Observable with the updated preferred tags
   */
  addPreferredTags(
    tagIds: string[],
    userId?: string
  ): Observable<{ tags: string[] }> {
    // First get all the tag names for the given IDs
    return forkJoin(
      tagIds.map((id) => this.http.get<any>(`${this.apiUrl}/tags/${id}`))
    ).pipe(
      switchMap((tags) => {
        const tagNames = tags.map((tag) => tag.name);

        return this.getUserId(userId).pipe(
          switchMap((id) => {
            // Get the user's current tags
            return this.http
              .get<{ tags: string[] }>(`${this.apiUrl}/users/${id}/tags`)
              .pipe(
                switchMap((currentTags) => {
                  // Add the new tags if they don't already exist
                  let updatedTags = [...(currentTags.tags || [])];

                  tagNames.forEach((tagName) => {
                    if (!updatedTags.includes(tagName)) {
                      updatedTags.push(tagName);
                    }
                  });

                  // Update the user's tags
                  return this.http.post<{ tags: string[] }>(
                    `${this.apiUrl}/users/${id}/tags`,
                    { tags: updatedTags }
                  );
                })
              );
          })
        );
      })
    );
  }

  /**
   * Remove a tag from a user's preferred tags
   * @param tagId The ID of the tag to remove
   * @param userId Optional user ID (defaults to current user)
   * @returns Observable with the updated preferred tags
   */
  removePreferredTag(
    tagId: string,
    userId?: string
  ): Observable<{ tags: string[] }> {
    // First get the tag name from the ID
    return this.http.get<any>(`${this.apiUrl}/tags/${tagId}`).pipe(
      switchMap((tag) => {
        const tagName = tag.name;

        return this.getUserId(userId).pipe(
          switchMap((id) => {
            // Get the user's current tags
            return this.http
              .get<{ tags: string[] }>(`${this.apiUrl}/users/${id}/tags`)
              .pipe(
                switchMap((currentTags) => {
                  // Remove the tag if it exists
                  let updatedTags = (currentTags.tags || []).filter(
                    (tag) => tag !== tagName
                  );

                  // Update the user's tags
                  return this.http.post<{ tags: string[] }>(
                    `${this.apiUrl}/users/${id}/tags`,
                    { tags: updatedTags }
                  );
                })
              );
          })
        );
      })
    );
  }

  /**
   * Add a tag by name - creates the tag if it doesn't exist
   * @param tagName The name of the tag to add
   * @param userId Optional user ID (defaults to current user)
   * @returns Observable with the updated preferred tags
   */
  addPreferredTagByName(
    tagName: string,
    userId?: string
  ): Observable<{ tags: string[] }> {
    // First get the user's current tags
    return this.getUserId(userId).pipe(
      switchMap((id) => {
        return this.http
          .get<{ tags: string[] }>(`${this.apiUrl}/users/${id}/tags`)
          .pipe(
            switchMap((currentTags) => {
              // Add the new tag if it doesn't already exist
              const normalizedTagName = tagName.toLowerCase().trim();
              let updatedTags = [...(currentTags.tags || [])];

              if (!updatedTags.includes(normalizedTagName)) {
                updatedTags.push(normalizedTagName);
              }

              // Update the user's tags
              return this.http.post<{ tags: string[] }>(
                `${this.apiUrl}/users/${id}/tags`,
                { tags: updatedTags }
              );
            })
          );
      })
    );
  }

  /**
   * Get all available tags
   * @returns Observable with all available tags
   */
  getAllTags(): Observable<TagData[]> {
    return this.http.get<TagData[]>(`${this.apiUrl}/tags`);
  }

  /**
   * Get user's preferred tags with full tag details (not just IDs)
   * @param userId Optional user ID (defaults to current user)
   * @returns Observable with the user's preferred tags with full details
   */
  getUserPreferredTags(userId?: string): Observable<TagData[]> {
    return this.getUserId(userId).pipe(
      switchMap((id) => {
        // Get user's tag names
        return this.http
          .get<{ tags: string[] }>(`${this.apiUrl}/users/${id}/tags`)
          .pipe(
            switchMap((response) => {
              if (!response.tags || response.tags.length === 0) {
                return of([]);
              }

              console.log('User preferred tag names:', response.tags);

              // Normalize the tag names for comparison (lowercase)
              const normalizedUserTags = response.tags.map((tag) =>
                tag.toLowerCase().trim()
              );

              // Get all available tags
              return this.getAllTags().pipe(
                map((allTags) => {
                  console.log('Available tags:', allTags);

                  // Filter to get only the user's preferred tags by matching on normalized tag name
                  const matchedTags = allTags.filter((tag) =>
                    normalizedUserTags.includes(tag.name.toLowerCase().trim())
                  );

                  console.log('Matched tags:', matchedTags);
                  return matchedTags;
                })
              );
            })
          );
      })
    );
  }

  uploadAvatar(userId?: string, file?: File): Observable<string> {
    if (!file) {
      throw new Error('No file provided for upload');
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.getUserId(userId).pipe(
      switchMap((id) =>
        this.http
          .post<{ avatar: string }>(
            `${this.apiUrl}/users/${id}/avatar`,
            formData
          )
          .pipe(
            map((response) => response.avatar) // Extract the URL from the response
          )
      )
    );
  }

  uploadCoverPhoto(userId?: string, file?: File): Observable<string> {
    if (!file) {
      throw new Error('No file provided for upload');
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.getUserId(userId).pipe(
      switchMap((id) =>
        this.http
          .post<{ coverphoto: string }>(
            `${this.apiUrl}/users/${id}/cover-photo`,
            formData
          )
          .pipe(map((response) => response.coverphoto))
      )
    );
  }
}
