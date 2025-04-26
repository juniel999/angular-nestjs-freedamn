import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError, of, tap, take } from 'rxjs';
import { environment } from '../../environments/environment';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import { BlogPostType } from '../types/blog-post.type';

export interface BlogsResponse {
  posts: BlogPostType[];
  total: number;
  page: number;
}

@Injectable({
  providedIn: 'root',
})
export class BlogService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/blogs`;

  // State management with signals
  private blogsState = signal<{
    forYou: BlogsResponse | null;
    explore: BlogsResponse | null;
    following: BlogsResponse | null;
    filtered: BlogsResponse | null;
    loading: boolean;
    currentTab: 'for-you' | 'explore' | 'following';
    currentFilter: string | null;
  }>({
    forYou: null,
    explore: null,
    following: null,
    filtered: null,
    loading: false,
    currentTab: 'explore', // Change default to explore
    currentFilter: null,
  });

  constructor() {
    // Check auth status and initialize appropriate tab
    this.authService.currentUser$.pipe(take(1)).subscribe((user) => {
      const initialTab = user ? 'for-you' : 'explore';
      this.setActiveTab(initialTab);
    });
  }

  // Computed values
  loading = computed(() => this.blogsState().loading);
  currentTab = computed(() => this.blogsState().currentTab);
  currentFilter = computed(() => this.blogsState().currentFilter);

  // Get current blogs based on active tab
  currentBlogs = computed(() => {
    if (this.currentFilter()) {
      return this.blogsState().filtered;
    }

    switch (this.currentTab()) {
      case 'for-you':
        return this.blogsState().forYou;
      case 'explore':
        return this.blogsState().explore;
      case 'following':
        return this.blogsState().following;
      default:
        return this.blogsState().forYou;
    }
  });

  /**
   * Set the active tab
   */
  setActiveTab(tab: 'for-you' | 'explore' | 'following') {
    // Always reset state when changing tabs
    this.blogsState.update((state) => ({
      ...state,
      currentTab: tab,
      currentFilter: null,
      [tab]: null, // Reset the current tab's data to force a fresh load
    }));

    // Load data for the selected tab
    this.loadTabData(tab, 1);
  }

  /**
   * Set filter for blogs
   */
  setFilter(filter: string | null) {
    if (filter === this.currentFilter()) return;

    // Reset filtered data when changing filters
    this.blogsState.update((state) => ({
      ...state,
      currentFilter: filter,
      filtered: null,
    }));

    if (filter) {
      this.loadFilteredBlogs(filter, 1);
    }
  }

  /**
   * Load data for the specified tab
   */
  private loadTabData(tab: 'for-you' | 'explore' | 'following', page: number) {
    switch (tab) {
      case 'for-you':
        if (!this.blogsState().forYou || page > 1) {
          this.loadForYouBlogs(page);
        }
        break;
      case 'explore':
        if (!this.blogsState().explore || page > 1) {
          this.loadExploreBlogs(page);
        }
        break;
      case 'following':
        if (!this.blogsState().following || page > 1) {
          this.loadFollowingBlogs(page);
        }
        break;
    }
  }

  /**
   * Load more blogs for current tab
   */
  loadMore() {
    const currentData = this.currentBlogs();
    if (!currentData || this.loading()) return;

    const nextPage = currentData.page + 1;

    if (this.currentFilter()) {
      this.loadFilteredBlogs(this.currentFilter()!, nextPage);
    } else {
      this.loadTabData(this.currentTab(), nextPage);
    }
  }

  /**
   * Load "For You" blogs based on user's preferred tags
   */
  private loadForYouBlogs(page: number = 1): void {
    this.blogsState.update((state) => ({ ...state, loading: true }));

    this.http
      .get<BlogsResponse>(`${this.apiUrl}/for-you?page=${page}`)
      .pipe(
        catchError((error) => {
          this.toastService.show('Failed to load blogs', 'error');
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.blogsState.update((state) => {
            // If first page, replace data; otherwise append
            const existingPosts = page === 1 ? [] : state.forYou?.posts || [];
            const newPosts = [...existingPosts, ...response.posts];

            return {
              ...state,
              forYou: {
                ...response,
                posts: newPosts,
                page,
              },
              loading: false,
            };
          });
        },
        error: () => {
          this.blogsState.update((state) => ({ ...state, loading: false }));
        },
      });
  }

  /**
   * Load explore (random) blogs
   */
  private loadExploreBlogs(page: number = 1): void {
    this.blogsState.update((state) => ({ ...state, loading: true }));

    this.http
      .get<BlogsResponse>(`${this.apiUrl}/explore?page=${page}`)
      .pipe(
        catchError((error) => {
          this.toastService.show('Failed to load explore blogs', 'error');
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.blogsState.update((state) => {
            // Only append if we're loading more pages and there are existing posts
            const existingPosts =
              page === 1 || !state.explore?.posts ? [] : state.explore.posts;

            // Filter out any duplicate posts that might come from random selection
            const uniquePosts = response.posts.filter(
              (newPost) =>
                !existingPosts.some(
                  (existingPost) => existingPost._id === newPost._id
                )
            );

            const newPosts = [...existingPosts, ...uniquePosts];

            return {
              ...state,
              explore: {
                posts: newPosts,
                total: response.total,
                page: page,
              },
              loading: false,
            };
          });
        },
        error: () => {
          this.blogsState.update((state) => ({ ...state, loading: false }));
        },
      });
  }

  /**
   * Load blogs from followed authors
   */
  private loadFollowingBlogs(page: number = 1): void {
    this.blogsState.update((state) => ({ ...state, loading: true }));

    this.http
      .get<BlogsResponse>(`${this.apiUrl}/following?page=${page}`)
      .pipe(
        catchError((error) => {
          this.toastService.show('Failed to load following blogs', 'error');
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.blogsState.update((state) => {
            // If first page, replace data; otherwise append
            const existingPosts =
              page === 1 ? [] : state.following?.posts || [];
            const newPosts = [...existingPosts, ...response.posts];

            return {
              ...state,
              following: {
                ...response,
                posts: newPosts,
                page,
              },
              loading: false,
            };
          });
        },
        error: () => {
          this.blogsState.update((state) => ({ ...state, loading: false }));
        },
      });
  }

  /**
   * Load blogs filtered by tag
   */
  private loadFilteredBlogs(filter: string, page: number = 1): void {
    this.blogsState.update((state) => ({ ...state, loading: true }));

    this.http
      .get<BlogsResponse>(`${this.apiUrl}?filter=${filter}&page=${page}`)
      .pipe(
        catchError((error) => {
          this.toastService.show(
            `Failed to load blogs with tag: ${filter}`,
            'error'
          );
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.blogsState.update((state) => {
            // If first page, replace data; otherwise append
            const existingPosts = page === 1 ? [] : state.filtered?.posts || [];
            const newPosts = [...existingPosts, ...response.posts];

            return {
              ...state,
              filtered: {
                ...response,
                posts: newPosts,
                page,
              },
              loading: false,
            };
          });
        },
        error: () => {
          this.blogsState.update((state) => ({ ...state, loading: false }));
        },
      });
  }

  /**
   * Like a blog post
   */
  likeBlog(blogId: string): Observable<BlogPostType> {
    return this.http.post<BlogPostType>(`${this.apiUrl}/${blogId}/like`, {});
  }

  /**
   * Unlike a blog post
   */
  unlikeBlog(blogId: string): Observable<BlogPostType> {
    return this.http.delete<BlogPostType>(`${this.apiUrl}/${blogId}/like`);
  }

  /**
   * Upload an image to Cloudinary
   */
  uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ url: string }>(
      `${this.apiUrl}/upload-image`,
      formData
    );
  }

  /**
   * Create a new blog post
   */
  createBlog(blogData: Partial<BlogPostType>): Observable<BlogPostType> {
    return this.http.post<BlogPostType>(this.apiUrl, blogData);
  }

  /**
   * Get a single blog by ID
   */
  getBlogById(id: string): Observable<BlogPostType> {
    return this.http.get<BlogPostType>(`${this.apiUrl}/${id}`);
  }

  /**
   * Update a blog in the state after like/unlike
   */
  updateBlogInState(updatedBlog: BlogPostType): void {
    // Update the blog in all relevant state categories
    this.blogsState.update((state) => {
      // Helper function to update a blog in a BlogsResponse object
      const updateBlogInResponse = (
        response: BlogsResponse | null
      ): BlogsResponse | null => {
        if (!response) return null;

        const updatedPosts = response.posts.map((post) =>
          post._id === updatedBlog._id ? updatedBlog : post
        );

        return {
          ...response,
          posts: updatedPosts,
        };
      };

      return {
        ...state,
        forYou: updateBlogInResponse(state.forYou),
        explore: updateBlogInResponse(state.explore),
        following: updateBlogInResponse(state.following),
        filtered: updateBlogInResponse(state.filtered),
      };
    });
  }
}
