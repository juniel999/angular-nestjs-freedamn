import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { SocialLinks, UserStats, UserType } from '../types/user.type';
import { Observable, switchMap, of, take, map, forkJoin } from 'rxjs';
import { TagData } from '../types/tag.type';
import { BlogPostType } from '../types/blog-post.type';

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

  findUserByUsername(username: string): Observable<UserType | null> {
    console.log('Finding user by username in server:', username);
    return this.http.get<UserType>(`${this.apiUrl}/users/find/${username}`);
  }

  getUserProfile(userId: string): Observable<UserType | null> {
    return this.http.get<UserType>(`${this.apiUrl}/users/${userId}/profile`);
  }

  /**
   * Get user statistics (posts count, followers count, following count)
   */
  getUserStats(userId: string): Observable<UserStats> {
    return forkJoin({
      posts: this.getUserPosts(userId),
      followers: this.getUserFollowers(userId),
      following: this.getUserFollowing(userId),
    }).pipe(
      map(({ posts, followers, following }) => ({
        postsCount: posts.count,
        followersCount: followers.count,
        followingCount: following.count,
      }))
    );
  }
  /**
   * Get user posts
   */
  getUserPosts(
    userId: string
  ): Observable<{ posts: BlogPostType[]; count: number }> {
    return this.http.get<{ posts: BlogPostType[]; count: number }>(
      `${this.apiUrl}/users/${userId}/posts`
    );
  }
  /**
   * Get user saved posts
   */
  getUserSavedPosts(
    userId: string
  ): Observable<{ posts: any[]; count: number }> {
    return this.http.get<{ posts: any[]; count: number }>(
      `${this.apiUrl}/users/${userId}/saved-posts`
    );
  }
  /**
   * Get user followers
   */
  getUserFollowers(
    userId: string
  ): Observable<{ followers: UserType[]; count: number }> {
    return this.http.get<{ followers: UserType[]; count: number }>(
      `${this.apiUrl}/users/${userId}/followers`
    );
  }
  /**
   * Get users that a user is following
   */
  getUserFollowing(
    userId: string
  ): Observable<{ following: UserType[]; count: number }> {
    return this.http.get<{ following: UserType[]; count: number }>(
      `${this.apiUrl}/users/${userId}/following`
    );
  }

  /**
   * Follow a user
   */
  followUser(userId: string): Observable<{ success: boolean; following: boolean }> {
    return this.http.post<{ success: boolean; following: boolean }>(
      `${this.apiUrl}/users/${userId}/follow`,
      {}
    );
  }

  /**
   * Unfollow a user
   */
  unfollowUser(userId: string): Observable<{ success: boolean; following: boolean }> {
    return this.http.post<{ success: boolean; following: boolean }>(
      `${this.apiUrl}/users/${userId}/unfollow`,
      {}
    );
  }

  /**
   * Check if current user is following another user
   */
  isFollowing(userId: string): Observable<{ following: boolean }> {
    return this.http.get<{ following: boolean }>(
      `${this.apiUrl}/users/${userId}/following-status`
    );
  }

  /**
   * Get user social links
   */
  getUserSocials(userId: string): Observable<SocialLinks> {
    return this.http.get<SocialLinks>(`${this.apiUrl}/users/${userId}/socials`);
  }

  /**
   * Update user social links
   */
  updateUserSocials(
    userId: string,
    socials: SocialLinks
  ): Observable<SocialLinks> {
    return this.http.patch<SocialLinks>(
      `${this.apiUrl}/users/${userId}/socials`,
      { socials }
    );
  }

  /**
   * Update user profile
   */
  updateUserProfile(
    userId: string,
    profileData: Partial<UserType>
  ): Observable<UserType> {
    return this.http.patch<UserType>(
      `${this.apiUrl}/users/${userId}/profile`,
      profileData
    );
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

              // Normalize the tag names for comparison (lowercase)
              const normalizedUserTags = response.tags.map((tag) =>
                tag.toLowerCase().trim()
              );

              // Get all available tags
              return this.getAllTags().pipe(
                map((allTags) => {
                  // Filter to get only the user's preferred tags by matching on normalized tag name
                  const matchedTags = allTags.filter((tag) =>
                    normalizedUserTags.includes(tag.name.toLowerCase().trim())
                  );

                  return matchedTags;
                })
              );
            })
          );
      })
    );
  }

  /**
   * Update user liked tags
   */
  updateUserLikedTags(
    userId: string,
    tags: string[]
  ): Observable<{ tags: string[] }> {
    return this.http.patch<{ tags: string[] }>(
      `${this.apiUrl}/users/${userId}/liked-tags`,
      { tags }
    );
  }

  uploadAvatar(userId?: string, file?: File): Observable<string> {
    if (!file) {
      throw new Error('No file provided for upload');
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<{ avatar: string }>(`${this.apiUrl}/users/me/avatar`, formData)
      .pipe(map((response) => response.avatar));
  }

  uploadCoverPhoto(userId?: string, file?: File): Observable<string> {
    if (!file) {
      throw new Error('No file provided for upload');
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<{ coverphoto: string }>(
        `${this.apiUrl}/users/me/coverphoto`,
        formData
      )
      .pipe(map((response) => response.coverphoto));
  }
}
