import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OnboardingService, TagData } from '../../../../services/onboarding.service';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-tags-step',
  imports: [ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './tags-step.component.html',
})
export class TagsStepComponent {
  private fb = inject(FormBuilder);
  private onboardingService = inject(OnboardingService);
  private router = inject(Router);
  
  tagsForm!: FormGroup;
  
  availableTags: TagData[] = [];
  selectedTags: string[] = [];
  
  isLoading = false;
  isSaving = false;
  hasMinimumTags = false;
  
  ngOnInit(): void {
    this.initForm();
    this.fetchAvailableTags();
  }
  
  initForm(): void {
    this.tagsForm = this.fb.group({
      tagInput: ['']
    });
  }
  
  fetchAvailableTags(): void {
    this.isLoading = true;
    this.onboardingService.getAvailableTags().subscribe({
      next: (tags) => {
        this.availableTags = tags;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching tags', error);
        this.isLoading = false;
      }
    });
  }
  
  toggleTagSelection(tagId: string): void {
    const index = this.selectedTags.indexOf(tagId);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tagId);
    }
    
    this.checkMinimumTags();
  }
  
  checkMinimumTags(): void {
    this.hasMinimumTags = this.selectedTags.length >= 3;
  }
  
  isTagSelected(tagId: string): boolean {
    return this.selectedTags.includes(tagId);
  }
  
  saveTags(): void {
    if (this.hasMinimumTags) {
      this.isSaving = true;
      this.onboardingService.updateUserTags(undefined, this.selectedTags).subscribe({
        next: () => {
          this.isSaving = false;
          this.router.navigate(['../../review'], { relativeTo: this.router.routerState.root.firstChild!.firstChild });
        },
        error: (error) => {
          console.error('Error saving tags', error);
          this.isSaving = false;
        }
      });
    }
  }
}
