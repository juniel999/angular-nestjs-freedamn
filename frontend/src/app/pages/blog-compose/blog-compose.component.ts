import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BlogService } from '../../services/blog.service';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';
import { finalize } from 'rxjs/operators';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-blog-compose',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FontAwesomeModule],
  templateUrl: './blog-compose.component.html',
})
export class BlogComposeComponent implements OnInit {
  blogForm: FormGroup;
  availableTags: { id: string; name: string }[] = [];
  isSubmitting = false;
  uploadedImages: { url: string; file: File }[] = [];
  imageUploading = false;

  constructor(
    private fb: FormBuilder,
    private blogService: BlogService,
    private userService: UserService,
    private toastService: ToastService,
    private router: Router
  ) {
    this.blogForm = this.createBlogForm();
  }

  ngOnInit(): void {
    this.loadAvailableTags();
  }

  /**
   * Create the blog form with validation
   */
  private createBlogForm(): FormGroup {
    return this.fb.group({
      title: [
        '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(100),
        ],
      ],
      content: ['', [Validators.required, Validators.minLength(50)]],
      tags: [[], [Validators.required, Validators.minLength(1)]],
      published: [true],
      coverImage: [''],
      images: this.fb.array([], [Validators.required, Validators.minLength(1)]),
    });
  }

  /**
   * Load available tags for selection
   */
  loadAvailableTags(): void {
    this.userService.getAllTags().subscribe({
      next: (tags) => {
        this.availableTags = tags;
      },
      error: (err) => {
        this.toastService.show('Failed to load tags', 'error');
        console.error('Error loading tags:', err);
      },
    });
  }

  /**
   * Get the images form array
   */
  get imagesArray(): FormArray {
    return this.blogForm.get('images') as FormArray;
  }

  /**
   * Handle image file selection
   */
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    // Validate file
    if (!this.validateImage(file)) return;

    this.uploadImage(file);
  }

  /**
   * Validate that file is an image and not too large
   */
  private validateImage(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      this.toastService.show(
        'Please upload an image file (JPEG, PNG, or GIF)',
        'error'
      );
      return false;
    }

    if (file.size > maxSize) {
      this.toastService.show('Image file size must be less than 5MB', 'error');
      return false;
    }

    return true;
  }

  /**
   * Upload image to server
   */
  private uploadImage(file: File): void {
    this.imageUploading = true;

    this.blogService
      .uploadImage(file)
      .pipe(
        finalize(() => {
          this.imageUploading = false;
        })
      )
      .subscribe({
        next: (response) => {
          // Add image URL to form array
          this.imagesArray.push(this.fb.control(response.url));

          // Store uploaded image info
          this.uploadedImages.push({
            url: response.url,
            file: file,
          });

          // If this is the first image, set it as cover image
          if (this.uploadedImages.length === 1) {
            this.setCoverImage(response.url);
          }

          this.toastService.show('Image uploaded successfully');
        },
        error: (err) => {
          this.toastService.show('Failed to upload image', 'error');
          console.error('Error uploading image:', err);
        },
      });
  }

  /**
   * Remove an uploaded image
   */
  removeImage(index: number): void {
    const imageUrl = this.uploadedImages[index].url;

    // If removing the cover image, reset or select another image as cover
    if (this.blogForm.get('coverImage')?.value === imageUrl) {
      // If there are other images, set the first one as cover
      if (this.uploadedImages.length > 1) {
        const newCoverIndex = index === 0 ? 1 : 0;
        this.setCoverImage(this.uploadedImages[newCoverIndex].url);
      } else {
        this.blogForm.patchValue({ coverImage: '' });
      }
    }

    this.imagesArray.removeAt(index);
    this.uploadedImages.splice(index, 1);
  }

  /**
   * Set cover image from uploaded images
   */
  setCoverImage(imageUrl: string): void {
    this.blogForm.patchValue({
      coverImage: imageUrl,
    });
    this.toastService.show('Cover image updated');
  }

  /**
   * Add or remove a tag from selection
   */
  toggleTag(tagId: string, tagName: string): void {
    const currentTags = this.blogForm.get('tags')?.value as string[];

    if (currentTags.includes(tagName)) {
      // Remove tag
      this.blogForm.patchValue({
        tags: currentTags.filter((tag) => tag !== tagName),
      });
    } else {
      // Add tag
      this.blogForm.patchValue({
        tags: [...currentTags, tagName],
      });
    }
  }

  /**
   * Submit the blog post
   */
  onSubmit(): void {
    if (this.blogForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.blogForm.controls).forEach((key) => {
        const control = this.blogForm.get(key);
        control?.markAsTouched();
      });

      // Special validation for images array
      if (this.imagesArray.length === 0) {
        this.imagesArray.markAsTouched();
        this.toastService.show('At least one image is required', 'error');
        return;
      }

      // Show general validation error
      this.toastService.show('Please fix the errors in the form', 'error');
      return;
    }

    if (this.imageUploading) {
      this.toastService.show(
        'Please wait for image upload to complete',
        'error'
      );
      return;
    }

    this.isSubmitting = true;

    // Prepare blog data
    const blogData = {
      ...this.blogForm.value,
      images: this.imagesArray.value,
    };

    // If no cover image is selected, use the first image
    if (!blogData.coverImage && this.imagesArray.length > 0) {
      blogData.coverImage = this.imagesArray.at(0)?.value;
    }

    this.blogService
      .createBlog(blogData)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: (newBlog) => {
          this.toastService.show('Blog post created successfully');
          // Navigate to the new blog post
          this.router.navigate(['/blog', newBlog._id]);
        },
        error: (err) => {
          this.toastService.show('Failed to create blog post', 'error');
          console.error('Error creating blog post:', err);
        },
      });
  }
}
