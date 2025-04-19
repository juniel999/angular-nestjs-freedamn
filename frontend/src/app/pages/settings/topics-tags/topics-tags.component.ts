import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import {
  OnboardingService,
  TagData,
} from '../../../services/onboarding.service';
import { ToastService } from '../../../services/toast.service';
import {
  Observable,
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  of,
  forkJoin,
} from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-topics-tags',
  templateUrl: './topics-tags.component.html',
  imports: [FontAwesomeModule, ReactiveFormsModule, CommonModule],
})
export class TopicsTagsComponent implements OnInit {
  userTags: TagData[] = [];
  availableTags: TagData[] = [];
  popularTags: TagData[] = [];
  filteredTags: TagData[] = [];
  isLoading: boolean = false;
  isSaving: boolean = false;

  newTagInput = new FormControl('');
  tagSearchInput = new FormControl('');

  private searchSubject = new Subject<string>();

  constructor(
    private userService: UserService,
    private onboardingService: OnboardingService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadUserAndAvailableTags();

    // Setup search with debounce
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((searchTerm) => {
        this.filterAvailableTags(searchTerm);
      });

    this.tagSearchInput.valueChanges.subscribe((value) => {
      this.searchSubject.next(value || '');
    });
  }

  loadUserAndAvailableTags(): void {
    this.isLoading = true;
    forkJoin({
      userTags: this.userService.getUserPreferredTags(),
      allTags: this.userService.getAllTags(),
      popularTags: this.onboardingService.getPopularTags(20),
    }).subscribe({
      next: (results) => {
        this.userTags = results.userTags;
        this.availableTags = results.allTags.filter(
          (tag) => !this.userTags.some((userTag) => userTag.id === tag.id)
        );
        this.popularTags = results.popularTags.filter(
          (tag) => !this.userTags.some((userTag) => userTag.id === tag.id)
        );
        this.filteredTags = [...this.availableTags];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading tags', error);
        this.toastService.show('Failed to load tags', 'error');
        this.isLoading = false;
      },
    });
  }

  filterAvailableTags(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === '') {
      this.filteredTags = [...this.availableTags];
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    this.filteredTags = this.availableTags.filter((tag) =>
      tag.name.toLowerCase().includes(term)
    );
  }

  addTag(tag: TagData): void {
    this.isSaving = true;
    this.userService.addPreferredTag(tag.id).subscribe({
      next: () => {
        // Add to user tags and remove from available tags
        this.userTags.push(tag);
        this.availableTags = this.availableTags.filter((t) => t.id !== tag.id);
        this.popularTags = this.popularTags.filter((t) => t.id !== tag.id);
        this.filterAvailableTags(this.tagSearchInput.value || '');
        this.toastService.show(`Added "${tag.name}" to your topics`, 'success');
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Error adding tag', error);
        this.toastService.show('Failed to add topic', 'error');
        this.isSaving = false;
      },
    });
  }

  removeTag(tag: TagData): void {
    this.isSaving = true;
    this.userService.removePreferredTag(tag.id).subscribe({
      next: () => {
        // Remove from user tags and add to available tags
        this.userTags = this.userTags.filter((t) => t.id !== tag.id);
        this.availableTags.push(tag);
        this.filterAvailableTags(this.tagSearchInput.value || '');
        this.toastService.show(
          `Removed "${tag.name}" from your topics`,
          'success'
        );
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Error removing tag', error);
        this.toastService.show('Failed to remove topic', 'error');
        this.isSaving = false;
      },
    });
  }

  createAndAddTag(): void {
    const newTagName = this.newTagInput.value?.trim();
    if (!newTagName) {
      return;
    }

    this.isSaving = true;

    // First check if tag already exists in available tags
    const existingTag = this.availableTags.find(
      (tag) => tag.name.toLowerCase() === newTagName.toLowerCase()
    );

    if (existingTag) {
      // Tag exists, just add it to user's preferred tags
      this.addTag(existingTag);
      this.newTagInput.setValue('');
      return;
    }

    // Tag doesn't exist, create it and add to user's preferred tags
    this.onboardingService.addTagsIfNotExist([newTagName]).subscribe({
      next: (createdTags) => {
        if (createdTags && createdTags.length > 0) {
          const newTag = createdTags[0];
          this.userService.addPreferredTag(newTag.id).subscribe({
            next: () => {
              this.userTags.push(newTag);
              this.toastService.show(
                `Created and added "${newTagName}" to your topics`,
                'success'
              );
              this.newTagInput.setValue('');
              this.isSaving = false;
            },
            error: (error) => {
              console.error('Error adding new tag', error);
              this.toastService.show('Failed to add new topic', 'error');
              this.isSaving = false;
            },
          });
        }
      },
      error: (error) => {
        console.error('Error creating tag', error);
        this.toastService.show('Failed to create new topic', 'error');
        this.isSaving = false;
      },
    });
  }
}
