import { Component, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BlogService } from '../../services/blog.service';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';
import { finalize } from 'rxjs/operators';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TagData } from '../../types/tag.type';
import { QuillModule, QuillEditorComponent } from 'ngx-quill';

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

  blogForm: FormGroup;
  availableTags: TagData[] = [];
  isSubmitting = false;
  imageUploading = false;

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
    private router: Router
  ) {
    this.blogForm = this.createBlogForm();
  }

  ngOnInit(): void {
    this.loadAvailableTags();
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
    console.log(deltaContent);
    console.log(this.quillEditor?.quillEditor);

    if (!deltaContent) {
      this.toastService.show('Content cannot be empty', 'error');
      this.isSubmitting = false;
      return;
    }

    const blogData = {
      ...this.blogForm.value,
      content: deltaContent, // Send the Delta format
      images: this.uploadedImages, // Send all uploaded image URLs
      coverImage: this.uploadedImages[0] || '', // Use first image as cover if available
    };

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
          this.router.navigate(['/blog', newBlog._id]);
        },
        error: (err) => {
          const errorMessage =
            err.status === 413
              ? 'Blog post content is too large. Try reducing the number of images or content size.'
              : 'Failed to create blog post';
          this.toastService.show(errorMessage, 'error');
          console.error('Error creating blog post:', err);
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
