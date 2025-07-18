import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Blog, BlogModel } from './blog.schema';
import { User } from '../users/user.schema';
import { TagsService } from '../tags/tags.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

@Injectable()
export class BlogsService {
  private seenRandomBlogIds: Set<string> = new Set();

  constructor(
    @InjectModel(Blog.name) private blogModel: Model<Blog> & BlogModel,
    @InjectModel(User.name) private userModel: Model<User>,
    private tagsService: TagsService,
    private cloudinaryService: CloudinaryService,
  ) {
    // Add virtual field for author's posts count
    this.userModel.schema.virtual('posts', {
      ref: 'Blog',
      localField: '_id',
      foreignField: 'author',
      count: true,
    });
  }

  private async processImagesInContent(content: any): Promise<{
    processedContent: any;
    processedContentHtml: string;
    imageUrls: string[];
  }> {
    const imageUrls: string[] = [];
    const processedContent = { ...content };
    let processedContentHtml = '';

    // Function to process base64 images in the Delta ops
    const processOps = async (ops: any[]) => {
      for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        if (op.insert && typeof op.insert === 'object' && op.insert.image) {
          // Check if the image is a base64 string
          if (op.insert.image.startsWith('data:image')) {
            try {
              // Upload to Cloudinary
              const uploadResult = await this.cloudinaryService.uploadImage(
                op.insert.image,
                'blog-content',
              );
              // Replace base64 with Cloudinary URL
              op.insert.image = uploadResult;
              imageUrls.push(uploadResult);
            } catch (error) {
              console.error('Error uploading image:', error);
              throw new BadRequestException('Failed to upload image');
            }
          } else {
            // If it's already a URL, add it to our list
            imageUrls.push(op.insert.image);
          }
        }
      }
    };

    // Process the Delta content
    if (content.ops) {
      await processOps(content.ops);
      // Convert Delta to HTML (you'll need to implement this based on your needs)
      processedContentHtml = this.deltaToHtml(content);
    }

    return {
      processedContent,
      processedContentHtml,
      imageUrls,
    };
  }

  private deltaToHtml(delta: any): string {
    if (!delta.ops) return '';

    let html = '';
    let textBuffer = '';

    for (const op of delta.ops) {
      if (typeof op.insert === 'string') {
        // Handle newlines specially since they carry the header formatting
        if (op.insert === '\n') {
          if (op.attributes?.header) {
            const headerClasses =
              {
                1: 'text-2xl md:text-4xl mb-6 mt-8',
                2: 'text-xl md:text-3xl mb-5 mt-7',
                3: 'text-lg md:text-2xl mb-4 mt-6',
                4: 'text-base md:text-xl mb-3 mt-5',
                5: 'text-sm md:text-lg mb-2 mt-4',
                6: 'text-sm md:text-base mb-2 mt-3',
              }[op.attributes.header] || 'text-2xl font-bold mb-4';

            html += `<h${op.attributes.header} class="${headerClasses}">${textBuffer}</h${op.attributes.header}>\n`;
          } else {
            html += `<p class="text-base leading-relaxed mb-4 text-gray-800">${textBuffer}</p>\n`;
          }
          textBuffer = '';
          continue;
        }

        // Handle inline formatting
        let text = op.insert;
        if (op.attributes) {
          if (op.attributes.bold)
            text = `<strong class="font-bold">${text}</strong>`;
          if (op.attributes.italic) text = `<em class="italic">${text}</em>`;
          if (op.attributes.underline)
            text = `<u class="underline">${text}</u>`;
          if (op.attributes.strike)
            text = `<s class="line-through">${text}</s>`;
          if (op.attributes.link)
            text = `<a href="${op.attributes.link}" target="_blank" class="text-blue-600 hover:text-blue-800 underline">${text}</a>`;
          if (op.attributes.code)
            text = `<code class="bg-gray-100 rounded px-1 py-0.5 font-mono text-sm">${text}</code>`;
          if (op.attributes.blockquote)
            text = `<blockquote class="border-l-4 border-gray-300 pl-4 italic my-4">${text}</blockquote>`;
        }
        textBuffer += text;
      } else if (op.insert?.image) {
        // For images, first flush any buffered text in p tags
        if (textBuffer) {
          html += `<p class="text-base leading-relaxed mb-4 text-gray-800">${textBuffer}</p>`;
          textBuffer = '';
        }
        html += `<img src="${op.insert.image}" alt="Blog content image" class="max-w-full h-auto rounded-lg my-6 shadow-lg"/>`;
      }
    }

    // Add any remaining buffered text in p tags
    if (textBuffer) {
      html += `<p class="text-base leading-relaxed mb-4 text-gray-800">${textBuffer}</p>`;
    }

    return html;
  }

  async create(createBlogDto: any, user: any): Promise<Blog> {
    // Process tags first
    if (createBlogDto.tags && createBlogDto.tags.length > 0) {
      await this.tagsService.addTagsIfNotExist(createBlogDto.tags);
    }

    // Process the content and images
    const { processedContent, processedContentHtml, imageUrls } =
      await this.processImagesInContent(createBlogDto.content);

    // Generate slug from title if not provided
    if (!createBlogDto.slug) {
      let baseSlug = this.blogModel.generateSlug(createBlogDto.title);
      let slug = baseSlug;
      let counter = 1;
      while (await this.blogModel.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      createBlogDto.slug = slug;
    }

    const createdBlog = new this.blogModel({
      ...createBlogDto,
      content: processedContent,
      contentHtml: processedContentHtml,
      images: imageUrls,
      coverImage: createBlogDto.coverImage || imageUrls[0], // Use first image as cover if not specified
      author: user._id || user.userId, // Support both formats
    });

    return createdBlog.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    sort = 'newest',
    filter?: string,
  ): Promise<{ posts: Blog[]; total: number; page: number }> {
    const skip = (page - 1) * limit;
    let sortOptions = {};

    // Set sort options based on parameter
    switch (sort) {
      case 'popular':
        sortOptions = { likes: -1, viewCount: -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
    }

    // Build query based on filters
    const query: any = { published: true };
    if (filter) {
      query.tags = { $in: [filter.toLowerCase().trim()] };
    }

    const [posts, total] = await Promise.all([
      this.blogModel
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'author',
          select:
            'username firstName lastName avatar pronouns title location bio email posts followers following',
          populate: { path: 'posts' },
        })
        .exec(),
      this.blogModel.countDocuments(query).exec(),
    ]);

    return { posts, total, page };
  }

  async findByTag(name: string): Promise<Blog[]> {
    const tag = await this.tagsService.findByName(name);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return this.blogModel
      .find({
        tags: { $in: [tag.name.toLowerCase().trim()] },
        published: true,
      })
      .sort({ createdAt: -1 })
      .populate({
        path: 'author',
        select:
          'username firstName lastName avatar pronouns title location bio email posts followers following',
        populate: { path: 'posts' },
      })
      .exec();
  }

  async findByUser(userId: string): Promise<Blog[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID format');
    }

    return this.blogModel
      .find({
        author: userId,
        published: true,
      })
      .sort({ createdAt: -1 })
      .populate({
        path: 'author',
        select:
          'username firstName lastName avatar pronouns title location bio email posts followers following',
        populate: { path: 'posts' },
      })
      .exec();
  }

  async findFeatured(): Promise<Blog[]> {
    // Featured blogs are those with the most likes and views
    // We're limiting to 10 featured blogs
    return this.blogModel
      .find({ published: true })
      .sort({ likes: -1, viewCount: -1, createdAt: -1 })
      .limit(10)
      .populate({
        path: 'author',
        select:
          'username firstName lastName avatar pronouns title location bio email posts followers following',
        populate: { path: 'posts' },
      })
      .exec();
  }

  async findUserFeedByTags(
    userTags: string[],
    page = 1,
    limit = 10,
  ): Promise<{ posts: Blog[]; total: number; page: number }> {
    // If no tags are provided, return all posts since user hasn't selected any preferences
    if (!userTags || userTags.length === 0) {
      return this.findAll(page, limit, 'newest');
    }

    const skip = (page - 1) * limit;
    const query = {
      published: true,
      tags: { $in: userTags.map((tag) => tag.toLowerCase().trim()) },
    };

    const [posts, total] = await Promise.all([
      this.blogModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'author',
          select:
            'username firstName lastName avatar pronouns title location bio email posts followers following',
          populate: { path: 'posts' },
        })
        .exec(),
      this.blogModel.countDocuments(query).exec(),
    ]);

    return { posts, total, page };
  }

  async findRandomBlogs(
    page = 1,
    limit = 10,
  ): Promise<{ posts: Blog[]; total: number; page: number }> {
    // Get total count of published blogs for pagination info
    const total = await this.blogModel
      .countDocuments({ published: true })
      .exec();

    // Get random blogs using $sample
    const posts = await this.blogModel
      .aggregate([
        { $match: { published: true } },
        { $sample: { size: limit } },
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'author',
          },
        },
        { $unwind: '$author' },
        // Add lookup for posts count
        {
          $lookup: {
            from: 'blogs',
            let: { authorId: '$author._id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$author', '$$authorId'] },
                      { $eq: ['$published', true] },
                    ],
                  },
                },
              },
              { $count: 'count' },
            ],
            as: 'postCount',
          },
        },
        {
          $addFields: {
            'author.posts': {
              $cond: {
                if: { $gt: [{ $size: '$postCount' }, 0] },
                then: { $arrayElemAt: ['$postCount.count', 0] },
                else: 0,
              },
            },
          },
        },
      ])
      .exec();

    return { posts, total, page };
  }

  async findBlogsByFollowedAuthors(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{ posts: Blog[]; total: number; page: number }> {
    const skip = (page - 1) * limit;

    // Get the user with their following list
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If user doesn't follow anyone, return empty array
    if (!user.following || user.following.length === 0) {
      return { posts: [], total: 0, page };
    }

    // Find blogs by followed authors
    const query = {
      author: { $in: user.following },
      published: true,
    };

    const [posts, total] = await Promise.all([
      this.blogModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'author',
          select:
            'username firstName lastName avatar pronouns title location bio email posts followers following',
          populate: { path: 'posts' },
        })
        .exec(),
      this.blogModel.countDocuments(query).exec(),
    ]);

    return { posts, total, page };
  }

  async findOne(id: string): Promise<Blog | null> {
    if (!Types.ObjectId.isValid(id)) {
      // Try finding by slug if id is not valid ObjectId
      return this.findBySlug(id);
    }

    // Increment view count
    await this.blogModel
      .findByIdAndUpdate(id, { $inc: { viewCount: 1 } })
      .exec();

    // Return the blog with populated author and comments information
    return this.blogModel
      .findById(id)
      .populate({
        path: 'author',
        select:
          'username firstName lastName avatar pronouns title location bio email posts followers following',
        populate: { path: 'posts' },
      })
      .populate({
        path: 'comments',
        populate: {
          path: 'userId',
          select: 'username avatar',
        },
        options: { sort: { createdAt: -1 } },
      })
      .exec();
  }

  private async findBySlug(slug: string): Promise<Blog | null> {
    // Increment view count
    await this.blogModel
      .findOneAndUpdate({ slug }, { $inc: { viewCount: 1 } })
      .exec();

    // Return the blog with populated author and comments information
    return this.blogModel
      .findOne({ slug })
      .populate({
        path: 'author',
        select:
          'username firstName lastName avatar pronouns title location bio email posts followers following',
        populate: { path: 'posts' },
      })
      .populate({
        path: 'comments',
        populate: {
          path: 'userId',
          select: 'username avatar',
        },
        options: { sort: { createdAt: -1 } },
      })
      .exec();
  }

  async update(id: string, updateBlogDto: any): Promise<Blog | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid blog ID format');
    }

    // Get the current blog to compare images
    const currentBlog = await this.blogModel.findById(id);
    if (!currentBlog) {
      throw new NotFoundException('Blog not found');
    }

    // If tags are being updated, process them
    if (updateBlogDto.tags && updateBlogDto.tags.length > 0) {
      await this.tagsService.addTagsIfNotExist(updateBlogDto.tags);
    }

    // If title is being updated, generate new slug
    if (updateBlogDto.title && updateBlogDto.title !== currentBlog.title) {
      let baseSlug = this.blogModel.generateSlug(updateBlogDto.title);

      // Check for duplicate slugs and append number if needed
      let slug = baseSlug;
      let counter = 1;
      while (await this.blogModel.findOne({ slug, _id: { $ne: id } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      updateBlogDto.slug = slug;
    }

    // If content is being updated, process it
    if (updateBlogDto.content) {
      const { processedContent, processedContentHtml, imageUrls } =
        await this.processImagesInContent(updateBlogDto.content);

      // Find images that are no longer used
      const oldImages = currentBlog.images || [];
      const imagesToDelete = oldImages.filter(
        (oldImg) => !imageUrls.includes(oldImg),
      );

      // Delete unused images from Cloudinary
      for (const imageUrl of imagesToDelete) {
        try {
          await this.cloudinaryService.deleteImageByUrl(imageUrl);
        } catch (error) {
          console.error('Failed to delete image:', error);
          // Continue with other deletions even if one fails
        }
      }

      updateBlogDto = {
        ...updateBlogDto,
        content: processedContent,
        contentHtml: processedContentHtml,
        images: imageUrls,
        // Only update cover image if:
        // 1. No cover image provided and we have new images, OR
        // 2. Current cover image was deleted
        ...(shouldUpdateCoverImage() && {
          coverImage: updateBlogDto.coverImage || imageUrls[0],
        }),
      };

      function shouldUpdateCoverImage(): boolean {
        // We already checked currentBlog is not null above
        const blog = currentBlog!;
        const noCoverImageButHasNewImages =
          !updateBlogDto.coverImage && imageUrls.length > 0;
        const currentCoverImageWasDeleted = Boolean(
          blog.coverImage && imagesToDelete.includes(blog.coverImage),
        );
        return noCoverImageButHasNewImages || currentCoverImageWasDeleted;
      }
    }

    const updatedBlog = await this.blogModel
      .findByIdAndUpdate(id, updateBlogDto, { new: true })
      .populate(
        'author',
        'username firstName lastName avatar pronouns title location bio email posts followers following',
      )
      .exec();

    if (!updatedBlog) {
      throw new NotFoundException('Blog not found');
    }

    return updatedBlog;
  }

  async remove(id: string): Promise<Blog | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid blog ID format');
    }

    // Get the blog to get its images before deletion
    const blog = await this.blogModel.findById(id);
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    // Delete all images associated with the blog
    const images = blog.images || [];
    for (const imageUrl of images) {
      try {
        await this.cloudinaryService.deleteImageByUrl(imageUrl);
      } catch (error) {
        console.error('Failed to delete image:', error);
        // Continue with other deletions even if one fails
      }
    }

    return this.blogModel.findByIdAndDelete(id).exec();
  }

  async like(blogId: string, userId: string): Promise<Blog> {
    if (!Types.ObjectId.isValid(blogId)) {
      throw new NotFoundException('Invalid blog ID format');
    }

    const blog = await this.blogModel.findById(blogId);

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    // Check if the user has already liked the blog
    const userIdObj = new Types.ObjectId(userId);
    const hasLiked = blog.likes.some((id) => id.toString() === userId);

    if (!hasLiked) {
      // Use updateOne to properly handle the array update
      await this.blogModel.updateOne(
        { _id: blogId },
        { $addToSet: { likes: userIdObj } },
      );

      // Return populated blog data
      const updatedBlog = await this.blogModel
        .findById(blogId)
        .populate({
          path: 'author',
          select:
            'username firstName lastName avatar pronouns title location bio email posts followers following',
          populate: { path: 'posts' },
        })
        .exec();

      if (!updatedBlog) {
        throw new NotFoundException('Blog not found after update');
      }

      return updatedBlog;
    }

    return blog;
  }

  async unlike(blogId: string, userId: string): Promise<Blog> {
    if (!Types.ObjectId.isValid(blogId)) {
      throw new NotFoundException('Invalid blog ID format');
    }

    const blog = await this.blogModel.findById(blogId);

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    // Check if user has liked the blog
    const hasLiked = blog.likes.some((id) => id.toString() === userId);
    if (!hasLiked) {
      throw new BadRequestException('You have not liked this blog');
    }

    // Use updateOne to properly handle the array update
    await this.blogModel.updateOne(
      { _id: blogId },
      { $pull: { likes: new Types.ObjectId(userId) } },
    );

    // Return populated blog data
    const updatedBlog = await this.blogModel
      .findById(blogId)
      .populate({
        path: 'author',
        select:
          'username firstName lastName avatar pronouns title location bio email posts followers following',
        populate: { path: 'posts' },
      })
      .exec();

    if (!updatedBlog) {
      throw new NotFoundException('Blog not found after update');
    }

    return updatedBlog;
  }

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    try {
      const url = await this.cloudinaryService.uploadImage(file, 'blog-images');
      return { url };
    } catch (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }
}
