import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Blog } from './blog.schema';
import { User } from '../users/user.schema';
import { TagsService } from '../tags/tags.service';

@Injectable()
export class BlogsService {
  constructor(
    @InjectModel(Blog.name) private blogModel: Model<Blog>,
    private tagsService: TagsService
  ) {}

  async create(createBlogDto: any, user: any): Promise<Blog> {
    // Process tags first
    if (createBlogDto.tags && createBlogDto.tags.length > 0) {
      await this.tagsService.addTagsIfNotExist(createBlogDto.tags);
    }
    
    const createdBlog = new this.blogModel({
      ...createBlogDto,
      author: user._id || user.userId // Support both formats
    });
    return createdBlog.save();
  }

  async findAll(page = 1, limit = 10, sort = 'newest'): Promise<{ blogs: Blog[], total: number }> {
    const skip = (page - 1) * limit;
    let sortOptions = {};
    
    // Set sort options based on parameter
    switch(sort) {
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
    
    const [blogs, total] = await Promise.all([
      this.blogModel.find({ published: true })
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('author', 'username firstName lastName avatar')
        .exec(),
      this.blogModel.countDocuments({ published: true }).exec()
    ]);
    
    return { blogs, total };
  }

  async findByTag(name: string): Promise<Blog[]> {
    const tag = await this.tagsService.findByName(name);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return this.blogModel.find({ 
      tags: { $in: [tag.name.toLowerCase().trim()] },
      published: true
    })
    .sort({ createdAt: -1 })
    .populate('author', 'username firstName lastName avatar')
    .exec();
  }

  async findByUser(userId: string): Promise<Blog[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID format');
    }

    return this.blogModel.find({ 
      author: userId,
      published: true 
    })
    .sort({ createdAt: -1 })
    .populate('author', 'username firstName lastName avatar')
    .exec();
  }

  async findFeatured(): Promise<Blog[]> {
    // Featured blogs are those with the most likes and views
    // We're limiting to 10 featured blogs
    return this.blogModel.find({ published: true })
      .sort({ likes: -1, viewCount: -1, createdAt: -1 })
      .limit(10)
      .populate('author', 'username firstName lastName avatar')
      .exec();
  }

  async findUserFeedByTags(userTags: string[]): Promise<Blog[]> {
    if (!userTags || userTags.length === 0) {
      return this.blogModel.find({ published: true })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('author', 'username firstName lastName avatar')
        .exec();
    }
    
    return this.blogModel.find({ 
      tags: { $in: userTags.map(tag => tag.toLowerCase().trim()) },
      published: true
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('author', 'username firstName lastName avatar')
    .exec();
  }

  async findOne(id: string): Promise<Blog | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid blog ID format');
    }
    
    // Increment view count
    await this.blogModel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();
    
    // Return the blog with populated author and comments information
    return this.blogModel.findById(id)
      .populate('author', 'username firstName lastName avatar')
      .populate({
        path: 'comments',
        populate: {
          path: 'userId',
          select: 'username avatar'
        },
        options: { sort: { 'createdAt': -1 } }
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
    if(!Types.ObjectId.isValid(id)){
      throw new NotFoundException('Invalid blog ID format');
    }

    return this.blogModel.findByIdAndDelete(id).exec();
  }

  async like(blogId: string, userId: string): Promise<Blog> {
    if(!Types.ObjectId.isValid(blogId)){
      throw new NotFoundException('Invalid blog ID format');
    }

    const blog = await this.blogModel.findById(blogId);
    
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }
    
    // Check if the user has already liked the blog
    const userIdObj = new Types.ObjectId(userId);
    const hasLiked = blog.likes.some(id => id.toString() === userId);
    
    if (!hasLiked) {
      // Use updateOne to properly handle the array update
      await this.blogModel.updateOne(
        { _id: blogId },
        { $addToSet: { likes: userIdObj } }
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
    if(!Types.ObjectId.isValid(blogId)){
      throw new NotFoundException('Invalid blog ID format');
    }

    const blog = await this.blogModel.findById(blogId);
    
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }
    
    // Use updateOne to properly handle the array update
    await this.blogModel.updateOne(
      { _id: blogId },
      { $pull: { likes: new Types.ObjectId(userId) } }
    );
    
    const updatedBlog = await this.blogModel.findById(blogId).exec();
    if (!updatedBlog) {
      throw new NotFoundException('Blog not found after update');
    }
    
    return updatedBlog;
  }
} 