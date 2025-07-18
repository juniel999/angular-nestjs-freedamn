import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { OnboardingService } from '../../../services/onboarding.service';
import { ToastService } from '../../../services/toast.service';
import {
  Subscription,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  finalize,
  catchError,
  of,
  switchMap,
} from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TagData } from '../../../types/tag.type';

@Component({
  selector: 'app-topics-tags',
  standalone: true,
  imports: [ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './topics-tags.component.html',
})
export class TopicsTagsComponent {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private onboardingService = inject(OnboardingService);
  private toastService = inject(ToastService);

  private subscriptions = new Subscription();

  // Form for the tag input
  tagsForm!: FormGroup;

  // Data
  selectedTags: TagData[] = []; // User's selected tags
  availableTags: TagData[] = []; // All available tags
  filteredTags: TagData[] = []; // Tags filtered by search

  // UI state
  errorMessage = '';
  isLoading = false;
  isSaving = false;

  ngOnInit(): void {
    this.initForm();
    this.loadData();

    // Setup search with debounce
    const sub = this.tagsForm
      .get('tagSearch')!
      .valueChanges.pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((searchTerm) => {
        this.filterAvailableTags(searchTerm);
      });

    this.subscriptions.add(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  initForm(): void {
    this.tagsForm = this.fb.group({
      tagInput: [{ value: '', disabled: false }],
      tagSearch: [{ value: '', disabled: false }],
    });
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const sub = forkJoin({
      userTags: this.userService.getUserPreferredTags(),
      allTags: this.userService.getAllTags(),
    }).subscribe({
      next: (results) => {
        // Make sure every tag has a valid ID
        this.selectedTags = results.userTags.map((tag, idx) => {
          if (!tag._id) {
            tag._id = `user-tag-${idx}-${Date.now()}`;
          }
          return tag;
        });

        this.availableTags = results.allTags
          .filter(
            (tag) =>
              !this.selectedTags.some((userTag) => userTag._id === tag._id)
          )
          .map((tag, idx) => {
            if (!tag._id) {
              tag._id = `avail-tag-${idx}-${Date.now()}`;
            }
            return tag;
          });

        // Sort available tags by usageCount if available
        this.availableTags.sort(
          (a, b) => (b.usageCount || 0) - (a.usageCount || 0)
        );
        this.filteredTags = [...this.availableTags];
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load tags. Please try again.';
        this.toastService.show('Failed to load tags', 'error');
        this.isLoading = false;
      },
    });

    this.subscriptions.add(sub);
  }

  filterAvailableTags(searchTerm: string | null): void {
    if (!searchTerm || searchTerm.trim() === '') {
      this.filteredTags = [...this.availableTags];
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    this.filteredTags = this.availableTags.filter((tag) =>
      tag.name.toLowerCase().includes(term)
    );
  }

  /**
   * Select a tag from the suggested list
   */
  selectTag(tag: TagData): void {
    if (this.isSaving) {
      return; // Don't proceed if already saving
    }

    // Check if tag is already in the list (case-insensitive comparison)
    const isDuplicate = this.selectedTags.some(
      (selectedTag) => selectedTag.name.toLowerCase() === tag.name.toLowerCase()
    );

    if (isDuplicate) {
      this.errorMessage = `"${tag.name}" is already in your topics.`;
      this.toastService.show(
        `"${tag.name}" is already in your topics`,
        'error'
      );
      return;
    }

    // Add the tag to user's preferences
    this.addTag(tag);
  }

  /**
   * Add a new tag via the input field
   */
  addNewTag(): void {
    if (this.isSaving) {
      return; // Don't proceed if already saving
    }

    const tagName = this.tagsForm.get('tagInput')?.value?.trim();

    // Validate empty tags
    if (!tagName || tagName.length === 0) {
      this.errorMessage = 'Please enter a tag before saving.';
      return;
    }

    // Check if tag is already in the list
    const isDuplicate = this.selectedTags.some(
      (tag) => tag.name.toLowerCase() === tagName.toLowerCase()
    );

    if (isDuplicate) {
      this.errorMessage = `"${tagName}" has already been added.`;
      return;
    }

    // Check if the tag already exists in available tags
    const existingTag = this.availableTags.find(
      (tag) => tag.name.toLowerCase() === tagName.toLowerCase()
    );

    if (existingTag) {
      // Tag exists, just add it
      this.addTag(existingTag);
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    // Disable the form controls while saving
    this.tagsForm.get('tagInput')?.disable();
    this.tagsForm.get('tagSearch')?.disable();

    try {
      // Create the tag in the database
      const sub = this.onboardingService
        .addTagsIfNotExist([tagName])
        .pipe(
          catchError((err) => {
            this.errorMessage = 'Failed to create tag. Please try again.';
            this.toastService.show('Failed to create new topic', 'error');
            return of([]);
          }),
          finalize(() => {
            if (this.errorMessage) {
              this.isSaving = false;
              this.tagsForm.get('tagInput')?.enable();
              this.tagsForm.get('tagSearch')?.enable();
            }
          })
        )
        .subscribe((createdTags) => {
          if (createdTags && createdTags.length > 0) {
            const newTag = createdTags[0];

            if (!newTag || !newTag.name) {
              this.errorMessage = 'Invalid tag created. Please try again.';
              this.toastService.show('Failed to create valid tag', 'error');
              this.isSaving = false;
              this.tagsForm.get('tagInput')?.enable();
              this.tagsForm.get('tagSearch')?.enable();
              return;
            }

            // Ensure the tag has a valid ID
            if (!newTag._id) {
              newTag._id = `new-tag-${Date.now()}`;
            }

            // Use direct name-based approach to update user's tags
            this.onboardingService
              .getUserTags()
              .pipe(
                catchError((error) => {
                  this.errorMessage = 'Failed to retrieve your current topics.';
                  this.toastService.show(
                    'Failed to update your topics',
                    'error'
                  );
                  return of({ tags: [] });
                }),
                switchMap((response) => {
                  const currentTags: string[] = [...(response.tags || [])];

                  // Add the new tag name if it doesn't exist
                  if (!currentTags.includes(newTag.name)) {
                    currentTags.push(newTag.name);
                  }

                  // Update the user's tags directly
                  return this.onboardingService
                    .updateUserTags(undefined, currentTags)
                    .pipe(
                      catchError((err) => {
                        this.errorMessage = 'Failed to update your topics.';
                        this.toastService.show(
                          'Failed to update your topics',
                          'error'
                        );
                        return of(null);
                      })
                    );
                }),
                finalize(() => {
                  this.isSaving = false;
                  this.tagsForm.get('tagInput')?.enable();
                  this.tagsForm.get('tagSearch')?.enable();
                })
              )
              .subscribe((result) => {
                if (result) {
                  // Success - add to local list
                  this.selectedTags.push(newTag);
                  this.tagsForm.get('tagInput')?.setValue('');
                  this.errorMessage = '';
                  this.toastService.show(
                    `Created and added "${newTag.name}" to your topics`,
                    'success'
                  );
                }
              });
          } else {
            this.isSaving = false;
            this.tagsForm.get('tagInput')?.enable();
            this.tagsForm.get('tagSearch')?.enable();
          }
        });

      this.subscriptions.add(sub);
    } catch (error) {
      this.errorMessage = 'An unexpected error occurred. Please try again.';
      this.toastService.show('Failed to add new topic', 'error');
      this.isSaving = false;
      this.tagsForm.get('tagInput')?.enable();
      this.tagsForm.get('tagSearch')?.enable();
    }
  }

  /**
   * Add an existing tag to user's preferences
   */
  addTag(tag: TagData): void {
    if (!tag || !tag.name || this.isSaving) {
      return; // Don't proceed if invalid tag or already saving
    }

    const normalizedTagName = tag.name.toLowerCase().trim();

    // Check if tag is already in user's selected tags (case-insensitive)
    const isDuplicate = this.selectedTags.some(
      (selectedTag) =>
        selectedTag.name.toLowerCase().trim() === normalizedTagName
    );

    if (isDuplicate) {
      this.errorMessage = `"${tag.name}" is already in your topics.`;
      this.toastService.show(
        `"${tag.name}" is already in your topics`,
        'error'
      );
      return;
    }

    // Ensure the tag has a valid ID
    if (!tag._id) {
      tag._id = `add-tag-${Date.now()}`;
    }

    this.isSaving = true;
    this.errorMessage = '';

    // Disable the form controls while saving
    this.tagsForm.get('tagInput')?.disable();
    this.tagsForm.get('tagSearch')?.disable();

    try {
      // Use direct name-based approach
      const sub = this.onboardingService
        .getUserTags()
        .pipe(
          catchError((error) => {
            this.errorMessage = 'Failed to retrieve your current topics.';
            this.toastService.show(
              'Failed to retrieve your current topics',
              'error'
            );
            return of({ tags: [] });
          }),
          switchMap((response) => {
            const currentTags: string[] = [...(response.tags || [])].map((t) =>
              t.toLowerCase().trim()
            );

            // Add the tag name if it doesn't exist
            if (!currentTags.includes(normalizedTagName)) {
              currentTags.push(normalizedTagName);
            }

            // Update the user's tags directly
            return this.onboardingService.updateUserTags(
              undefined,
              currentTags
            );
          }),
          catchError((error) => {
            this.errorMessage = 'Failed to add topic to your preferences.';
            this.toastService.show('Failed to add topic', 'error');
            return of(null);
          }),
          finalize(() => {
            this.isSaving = false;
            this.tagsForm.get('tagInput')?.enable();
            this.tagsForm.get('tagSearch')?.enable();
          })
        )
        .subscribe((result) => {
          if (result) {
            // Add to user tags and remove from available tags
            this.selectedTags.push(tag);
            this.availableTags = this.availableTags.filter(
              (t) =>
                t._id !== tag._id &&
                t.name.toLowerCase().trim() !== normalizedTagName
            );

            // Update filtered tags
            this.filterAvailableTags(
              this.tagsForm.get('tagSearch')?.value || ''
            );

            // Clear input field
            this.tagsForm.get('tagInput')?.setValue('');
            this.errorMessage = '';

            this.toastService.show(
              `Added "${tag.name}" to your topics`,
              'success'
            );
          }
        });

      this.subscriptions.add(sub);
    } catch (error) {
      this.errorMessage = 'An unexpected error occurred. Please try again.';
      this.toastService.show('Failed to add topic', 'error');
      this.isSaving = false;
      this.tagsForm.get('tagInput')?.enable();
      this.tagsForm.get('tagSearch')?.enable();
    }
  }

  /**
   * Remove a tag from the user's preferences
   */
  removeTag(tag: TagData): void {
    if (!tag || !tag.name || this.isSaving) {
      return; // Don't proceed if invalid tag or already saving
    }

    const normalizedTagName = tag.name.toLowerCase().trim();

    // Ensure the tag has a valid ID
    if (!tag._id) {
      tag._id = `remove-tag-${Date.now()}`;
    }

    this.isSaving = true;
    this.errorMessage = '';

    // Disable the form controls while processing
    this.tagsForm.get('tagInput')?.disable();
    this.tagsForm.get('tagSearch')?.disable();

    try {
      // Direct name-based approach
      const sub = this.onboardingService
        .getUserTags()
        .pipe(
          catchError((error) => {
            this.errorMessage = 'Failed to retrieve your current topics.';
            this.toastService.show(
              'Failed to retrieve your current topics',
              'error'
            );
            return of({ tags: [] });
          }),
          switchMap((response) => {
            const currentTags: string[] = [...(response.tags || [])].map((t) =>
              t.toLowerCase().trim()
            );

            // Filter out the tag to remove (case-insensitive comparison)
            const updatedTags = currentTags.filter(
              (t) => t !== normalizedTagName
            );

            // Update the user's tags directly
            return this.onboardingService.updateUserTags(
              undefined,
              updatedTags
            );
          }),
          catchError((error) => {
            this.errorMessage = 'Failed to remove topic from your preferences.';
            this.toastService.show('Failed to remove topic', 'error');
            return of(null);
          }),
          finalize(() => {
            this.isSaving = false;
            this.tagsForm.get('tagInput')?.enable();
            this.tagsForm.get('tagSearch')?.enable();
          })
        )
        .subscribe((result) => {
          if (result) {
            // Update local data
            this.selectedTags = this.selectedTags.filter(
              (t) =>
                t._id !== tag._id &&
                t.name.toLowerCase().trim() !== normalizedTagName
            );
            this.availableTags.push(tag);

            // Sort available tags by usageCount
            this.availableTags.sort(
              (a, b) => (b.usageCount || 0) - (a.usageCount || 0)
            );

            // Update filtered tags
            this.filterAvailableTags(
              this.tagsForm.get('tagSearch')?.value || ''
            );

            this.toastService.show(
              `Removed "${tag.name}" from your topics`,
              'success'
            );
          }
        });

      this.subscriptions.add(sub);
    } catch (error) {
      this.errorMessage = 'An unexpected error occurred. Please try again.';
      this.toastService.show('Failed to remove topic', 'error');
      this.isSaving = false;
      this.tagsForm.get('tagInput')?.enable();
      this.tagsForm.get('tagSearch')?.enable();
    }
  }
}
