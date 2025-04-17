import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { OnboardingService, TagData } from '../../../../services/onboarding.service';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../../services/user.service';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-tags-step',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FontAwesomeModule],
  templateUrl: './tags-step.component.html',
})
export class TagsStepComponent {
  private fb = inject(FormBuilder);
  private onboardingService = inject(OnboardingService);
  private userService = inject(UserService);
  
  private subscriptions = new Subscription();
  
  // Form for the tag input
  tagsForm!: FormGroup;
  
  // Data
  selectedTags: TagData[] = [];  // Tags added by the user
  topTags: TagData[] = [];       // Popular tags sorted by usage count
  
  // UI state
  errorMessage = '';
  isSaving = false;
  
  ngOnInit(): void {
    this.initForm();
    this.loadUserTags();
    this.loadTopTags();
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  
  initForm(): void {
    this.tagsForm = this.fb.group({
      tagInput: [{ value: '', disabled: false }]
    });
  }
  
  /**
   * Load user's existing tags
   */
  loadUserTags(): void {
    // Show loading state
    this.isSaving = true;
    this.errorMessage = '';
    
    // Disable the form control while loading
    this.tagsForm.get('tagInput')?.disable();
    
    // First, get user's tag names from backend
    const sub = this.onboardingService.getUserTags().subscribe({
      next: (response) => {
        if (response.tags && response.tags.length > 0) {
          console.log('User tag names:', response.tags);
          
          // Then get all available tags to find the matching ones with full details
          this.onboardingService.getAvailableTags().subscribe({
            next: (allTags) => {
              // Map tag names to full tag objects for the UI
              const userTags = response.tags.map((tagName, index) => {
                // Find the matching tag from all tags
                const matchingTag = allTags.find(t => 
                  t.name.toLowerCase().trim() === tagName.toLowerCase().trim()
                );
                
                // If found, use it; otherwise create a temporary object with a unique ID
                return matchingTag || { 
                  id: `temp-tag-${index}-${Date.now()}-${tagName.replace(/\s+/g, '-')}`, 
                  name: tagName 
                };
              });
              
              this.selectedTags = userTags;
              this.isSaving = false;
              
              // Enable the form control after loading
              this.tagsForm.get('tagInput')?.enable();
            },
            error: (err) => {
              console.error('Error loading all tags', err);
              this.errorMessage = 'Failed to load tag details.';
              this.isSaving = false;
              
              // Enable the form control after error
              this.tagsForm.get('tagInput')?.enable();
            }
          });
        } else {
          this.selectedTags = [];
          this.isSaving = false;
          
          // Enable the form control when no tags found
          this.tagsForm.get('tagInput')?.enable();
        }
      },
      error: (err) => {
        console.error('Error loading user tags', err);
        this.errorMessage = 'Failed to load your tags.';
        this.isSaving = false;
        
        // Enable the form control after error
        this.tagsForm.get('tagInput')?.enable();
      }
    });
    
    this.subscriptions.add(sub);
  }
  
  /**
   * Load top 10 tags sorted by usage count
   */
  loadTopTags(): void {
    // First try with getPopularTags
    this.onboardingService.getPopularTags(10).subscribe({
      next: (tags) => {
        if (tags.length > 0) {
          this.topTags = tags;
        } else {
          // Fallback to just getting all tags if no popular tags are returned
          this.onboardingService.getAvailableTags().subscribe({
            next: (allTags) => {
              this.topTags = allTags.slice(0, 10); // Just take the first 10 tags
            },
            error: (err) => {
              console.error('Error loading fallback tags', err);
            }
          });
        }
      },
      error: (err) => {
        console.error('Error loading top tags', err);
        
        // Fallback to just getting all tags
        this.onboardingService.getAvailableTags().subscribe({
          next: (allTags) => {
            this.topTags = allTags.slice(0, 10); // Just take the first 10 tags
          },
          error: (fallbackErr) => {
            console.error('Error loading fallback tags', fallbackErr);
          }
        });
      }
    });
  }
  
  /**
   * Select a tag from the suggested list
   */
  selectTag(tag: TagData): void {
    // Check if tag is already in the list
    const isDuplicate = this.selectedTags.some(selectedTag => 
      selectedTag.name.toLowerCase() === tag.name.toLowerCase()
    );
    
    if (isDuplicate) {
      this.errorMessage = `"${tag.name}" has already been added.`;
      return;
    }
    
    // Add the tag to user's preferences
    this.saveTagToUserPreferences(tag);
  }
  
  /**
   * Add a tag to the database and user's preferredTags
   */
  addTag(): void {
    const tagName = this.tagsForm.get('tagInput')?.value?.trim();
    
    // Validate empty tags
    if (!tagName || tagName.length === 0) {
      this.errorMessage = 'Please enter a tag before saving.';
      return;
    }
    
    // Check if tag is already in the list
    const isDuplicate = this.selectedTags.some(tag => 
      tag.name.toLowerCase() === tagName.toLowerCase()
    );
    
    if (isDuplicate) {
      this.errorMessage = `"${tagName}" has already been added.`;
      return;
    }
    
    this.isSaving = true;
    
    // Disable the form control while saving
    this.tagsForm.get('tagInput')?.disable();
    
    // First, add the tag to the database if it doesn't exist
    const sub = this.onboardingService.addTagsIfNotExist([tagName]).subscribe({
      next: (createdTags) => {
        if (createdTags && createdTags.length > 0) {
          // Add the new tag to the user's preferredTags
          this.saveTagToUserPreferences(createdTags[0]);
        } else {
          this.isSaving = false;
          this.errorMessage = 'Failed to create tag. Please try again.';
          
          // Enable the form control on error
          this.tagsForm.get('tagInput')?.enable();
        }
      },
      error: (err) => {
        console.error('Error creating tag', err);
        this.errorMessage = 'Failed to create tag. Please try again.';
        this.isSaving = false;
        
        // Enable the form control on error
        this.tagsForm.get('tagInput')?.enable();
      }
    });
    
    this.subscriptions.add(sub);
  }
  
  /**
   * Save tag to user's preferences
   */
  private saveTagToUserPreferences(tag: TagData): void {
    // Add tag to local list
    this.selectedTags.push(tag);
    
    // Get all tag names
    const tagNames = this.selectedTags.map(t => t.name.toLowerCase().trim());
    
    // Save to user's preferences
    const sub = this.onboardingService.updateUserTags(undefined, tagNames).subscribe({
      next: () => {
        // Clear the form
        this.tagsForm.get('tagInput')?.setValue('');
        this.errorMessage = '';
        this.isSaving = false;
        
        // Enable the form control after successful save
        this.tagsForm.get('tagInput')?.enable();
      },
      error: (err) => {
        console.error('Error saving tag to user preferences', err);
        this.errorMessage = 'Failed to save tag to your preferences.';
        this.isSaving = false;
        
        // Remove tag from local list since saving failed
        this.selectedTags = this.selectedTags.filter(t => t.id !== tag.id);
        
        // Enable the form control on error
        this.tagsForm.get('tagInput')?.enable();
      }
    });
    
    this.subscriptions.add(sub);
  }

  /**
   * Remove a tag from the user's preferences
   * @param tag The tag to remove
   */
  removeTag(tag: TagData): void {
    if (!tag || !tag.name || this.isSaving) {
      return; // Don't proceed if no tag, no name, or already saving
    }
    
    // Set loading state
    this.isSaving = true;
    this.errorMessage = '';
    
    // Disable the form control while processing
    this.tagsForm.get('tagInput')?.disable();
    
    console.log('Attempting to remove tag:', tag);
    console.log('Current tags before removal:', this.selectedTags);
    
    const clickedTagIndex = this.selectedTags.indexOf(tag);
    console.log(`Exact tag match found at index: ${clickedTagIndex}`);
    
    if (clickedTagIndex !== -1) {
      // Create a new array without the clicked tag
      const updatedTags = [
        ...this.selectedTags.slice(0, clickedTagIndex),
        ...this.selectedTags.slice(clickedTagIndex + 1)
      ];
      this.selectedTags = updatedTags;
    } else { 
      // Fallback to name-based removal if exact object reference isn't found
      const tagToRemoveName = tag.name.toLowerCase().trim();
      this.selectedTags = this.selectedTags.filter(t => 
        t.name.toLowerCase().trim() !== tagToRemoveName
      );
    }
    
    console.log('Tags after removal:', this.selectedTags);
    
    // Get all remaining tag names
    const tagNames = this.selectedTags.map(t => t.name.toLowerCase().trim());
    
    console.log('Remaining normalized tag names:', tagNames);
    
    // Update user's preferences with tag names
    const sub = this.onboardingService.updateUserTags(undefined, tagNames).subscribe({
      next: (response) => {
        // Success - tag removed
        console.log('Tag removed successfully, server response:', response);
        this.isSaving = false;
        
        // Enable the form control after successful removal
        this.tagsForm.get('tagInput')?.enable();
      },
      error: (err) => {
        console.error('Error removing tag from user preferences', err);
        this.errorMessage = 'Failed to remove tag from your preferences.';
        this.isSaving = false;
        
        // Add tag back to local list since removal failed
        this.selectedTags.push(tag);
        
        // Enable the form control on error
        this.tagsForm.get('tagInput')?.enable();
      }
    });
    
    this.subscriptions.add(sub);
  }
}
