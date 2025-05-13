import { Component, inject, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BlogService } from '../../services/blog.service';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';
import { finalize, switchMap, catchError, map } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TagData } from '../../types/tag.type';
import { QuillModule, QuillEditorComponent } from 'ngx-quill';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-blog-compose',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    FontAwesomeModule,
    QuillModule,
  ],
  templateUrl: './blog-compose.component.html',
})
export class BlogComposeComponent implements OnInit {
  @ViewChild('quillEditor') quillEditor?: QuillEditorComponent;
  private authService = inject(AuthService);

  blogForm: FormGroup;
  availableTags: TagData[] = [];
  isSubmitting = false;
  imageUploading = false;
  isEditMode = false;
  blogId: string | null = null;
  private pendingContent: any = null;

  quillConfig = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ header: 1 }, { header: 2 }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ script: 'sub' }, { script: 'super' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ direction: 'rtl' }],
      [{ size: ['small', false, 'large', 'huge'] }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ color: [] }, { background: [] }],
      [{ font: [] }],
      [{ align: [] }],
      ['clean'],
      ['link', 'image', 'video'],
    ],
    imageHandler: this.imageHandler.bind(this),
  };

  private uploadedImages: string[] = [];

  constructor(
    private fb: FormBuilder,
    private blogService: BlogService,
    private userService: UserService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.blogForm = this.createBlogForm();
  }

  ngOnInit(): void {
    this.loadAvailableTags();

    // Check if we're in edit mode
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.blogId = id;
      this.loadBlogData(id);
    }
  }

  private loadBlogData(id: string) {
    this.blogService.getBlogById(id).subscribe({
      next: (blog) => {
        // Store the image URLs
        this.uploadedImages = blog.images || [];

        // Update form with blog data
        this.blogForm.patchValue({
          title: blog.title,
          tags: blog.tags,
          published: blog.published,
          coverImage: blog.coverImage,
        });

        // Store content to be set when editor is ready
        this.pendingContent = blog.content;

        // Try to set content if editor is already ready
        if (this.quillEditor?.quillEditor) {
          this.quillEditor.quillEditor.setContents(this.pendingContent);
          this.pendingContent = null;
        }
      },
      error: (err) => {
        this.toastService.show('Failed to load blog post', 'error');
        console.error('Error loading blog:', err);
        this.router.navigate(['/']);
      },
    });
  }

  onEditorCreated() {
    if (this.pendingContent && this.quillEditor?.quillEditor) {
      this.quillEditor.quillEditor.setContents(this.pendingContent);
      this.pendingContent = null;
    }
  }

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
    });
  }

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

  toggleTag(tagId: string, tagName: string): void {
    const currentTags = this.blogForm.get('tags')?.value as string[];

    if (currentTags.includes(tagName)) {
      this.blogForm.patchValue({
        tags: currentTags.filter((tag) => tag !== tagName),
      });
    } else {
      this.blogForm.patchValue({
        tags: [...currentTags, tagName],
      });
    }
  }

  onSubmit(): void {
    if (this.blogForm.invalid) {
      Object.keys(this.blogForm.controls).forEach((key) => {
        const control = this.blogForm.get(key);
        control?.markAsTouched();
      });

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

    // Get the Quill editor content in Delta format
    const deltaContent = this.quillEditor?.quillEditor?.getContents();

    if (!deltaContent) {
      this.toastService.show('Content cannot be empty', 'error');
      this.isSubmitting = false;
      return;
    }

    const blogData = {
      ...this.blogForm.value,
      content: deltaContent,
      images: this.uploadedImages,
      coverImage:
        this.blogForm.get('coverImage')?.value || this.uploadedImages[0] || '',
    };

    // If in edit mode, find images to delete
    if (this.isEditMode) {
      this.blogService
        .getBlogById(this.blogId!)
        .pipe(
          finalize(() => {
            this.isSubmitting = false;
          }),
          switchMap((oldBlog) => {
            const oldImages = oldBlog.images || [];
            // Find images that are no longer used
            const imagesToDelete = oldImages.filter(
              (oldImg) => !this.uploadedImages.includes(oldImg)
            );

            // Delete unused images
            const deletionRequests = imagesToDelete.map((img) =>
              this.blogService.deleteImage(img).pipe(
                catchError((err) => {
                  console.error('Failed to delete image:', err);
                  return of(null);
                })
              )
            );

            return forkJoin([of(blogData), ...deletionRequests]);
          }),
          map(([blogData]) => blogData)
        )
        .subscribe({
          next: (blogData) => this.saveBlog(blogData),
          error: (err) => {
            const errorMessage =
              err.status === 413
                ? 'Blog post content is too large. Try reducing the number of images or content size.'
                : this.isEditMode
                ? 'Failed to update blog post'
                : 'Failed to create blog post';
            this.toastService.show(errorMessage, 'error');
            console.error(
              this.isEditMode
                ? 'Error updating blog post:'
                : 'Error creating blog post:',
              err
            );
          },
        });
    } else {
      this.saveBlog(blogData);
    }
  }

  private saveBlog(blogData: any) {
    const request = this.isEditMode
      ? this.blogService.updateBlog(this.blogId!, blogData)
      : this.blogService.createBlog(blogData);

    request
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: (blog) => {
          this.toastService.show(
            this.isEditMode
              ? 'Blog post updated successfully'
              : 'Blog post created successfully'
          );
          this.router.navigate(['/blogs', blog._id]);
        },
        error: (err) => {
          const errorMessage =
            err.status === 413
              ? 'Blog post content is too large. Try reducing the number of images or content size.'
              : this.isEditMode
              ? 'Failed to update blog post'
              : 'Failed to create blog post';
          this.toastService.show(errorMessage, 'error');
          console.error(
            this.isEditMode
              ? 'Error updating blog post:'
              : 'Error creating blog post:',
            err
          );
        },
      });
  }

  imageHandler(): void {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = () => {
      const file = input.files?.[0];
      if (file && this.validateImage(file)) {
        this.uploadContentImage(file);
      }
    };
  }

  private uploadContentImage(file: File): void {
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
          if (this.quillEditor?.quillEditor) {
            const range = this.quillEditor.quillEditor.getSelection(true) as {
              index: number;
            };
            if (range) {
              this.quillEditor.quillEditor.insertEmbed(
                range.index,
                'image',
                response.url
              );
              // Add to uploaded images array
              this.uploadedImages.push(response.url);
              this.toastService.show('Image inserted successfully');
            } else {
              // If no selection, append at the end
              const length = this.quillEditor.quillEditor.getLength();
              this.quillEditor.quillEditor.insertEmbed(
                length - 1,
                'image',
                response.url
              );
              // Add to uploaded images array
              this.uploadedImages.push(response.url);
              this.toastService.show('Image inserted at the end');
            }

            // Set first uploaded image as cover if not already set
            if (this.uploadedImages.length === 1) {
              this.blogForm.patchValue({
                coverImage: response.url,
              });
            }
          } else {
            this.toastService.show('Editor not initialized', 'error');
          }
        },
        error: (err) => {
          this.toastService.show('Failed to upload image', 'error');
          console.error('Error uploading image:', err);
        },
      });
  }
}
