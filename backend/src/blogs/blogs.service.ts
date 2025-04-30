import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Blog } from './blog.schema';
import { User } from '../users/user.schema';
import { TagsService } from '../tags/tags.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

@Injectable()
export class BlogsService {
  private seenRandomBlogIds: Set<string> = new Set();

  constructor(
    @InjectModel(Blog.name) private blogModel: Model<Blog>,
    @InjectModel(User.name) private userModel: Model<User>,
    private tagsService: TagsService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(createBlogDto: any, user: any): Promise<Blog> {
    // Process tags first
    if (createBlogDto.tags && createBlogDto.tags.length > 0) {
      await this.tagsService.addTagsIfNotExist(createBlogDto.tags);
    }

    const createdBlog = new this.blogModel({
      ...createBlogDto,
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
        .populate(
          'author',
          'username firstName lastName avatar pronouns title location bio email posts followers following',
        )
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
      .populate(
        'author',
        'username firstName lastName avatar pronouns title location bio email posts followers following',
      )
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
      .populate(
        'author',
        'username firstName lastName avatar pronouns title location bio email posts followers following',
      )
      .exec();
  }

  async findFeatured(): Promise<Blog[]> {
    // Featured blogs are those with the most likes and views
    // We're limiting to 10 featured blogs
    return this.blogModel
      .find({ published: true })
      .sort({ likes: -1, viewCount: -1, createdAt: -1 })
      .limit(10)
      .populate(
        'author',
        'username firstName lastName avatar pronouns title location bio email posts followers following',
      )
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
        .populate(
          'author',
          'username firstName lastName avatar pronouns title location bio email posts followers following',
        )
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
        { $sample: { size: limit } }, // Use $sample for true randomization
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'author',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  username: 1,
                  firstName: 1,
                  lastName: 1,
                  avatar: 1,
                  pronouns: 1,
                  title: 1,
                  location: 1,
                  bio: 1,
                  email: 1,
                  posts: 1,
                  followers: 1,
                  following: 1,
                },
              },
            ],
          },
        },
        { $unwind: '$author' },
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
        .populate(
          'author',
          'username firstName lastName avatar pronouns title location bio email posts followers following',
        )
        .exec(),
      this.blogModel.countDocuments(query).exec(),
    ]);

    return { posts, total, page };
  }

  async findOne(id: string): Promise<Blog | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid blog ID format');
    }

    // Increment view count
    await this.blogModel
      .findByIdAndUpdate(id, { $inc: { viewCount: 1 } })
      .exec();

    // Return the blog with populated author and comments information
    return this.blogModel
      .findById(id)
      .populate(
        'author',
        'username firstName lastName avatar pronouns title location bio email posts followers following',
      )
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

    // If tags are being updated, process them
    if (updateBlogDto.tags && updateBlogDto.tags.length > 0) {
      await this.tagsService.addTagsIfNotExist(updateBlogDto.tags);
    }

    return this.blogModel
      .findByIdAndUpdate(id, updateBlogDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<Blog | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid blog ID format');
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

      const updatedBlog = await this.blogModel.findById(blogId).exec();
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

    // Use updateOne to properly handle the array update
    await this.blogModel.updateOne(
      { _id: blogId },
      { $pull: { likes: new Types.ObjectId(userId) } },
    );

    const updatedBlog = await this.blogModel.findById(blogId).exec();
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
