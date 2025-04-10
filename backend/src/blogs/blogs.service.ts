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

  async findAll(): Promise<Blog[]> {
    return this.blogModel.find().exec();
  }

  async findByTag(tag: string): Promise<Blog[]> {
    return this.blogModel.find({ tags: { $in: [tag.toLowerCase().trim()] } }).exec();
  }

  async findUserFeedByTags(userTags: string[]): Promise<Blog[]> {
    if (!userTags || userTags.length === 0) {
      return this.blogModel.find({ published: true })
        .sort({ createdAt: -1 })
        .exec();
    }
    
    return this.blogModel.find({ 
      tags: { $in: userTags.map(tag => tag.toLowerCase().trim()) },
      published: true
    })
    .sort({ createdAt: -1 })
    .exec();
  }

  async findOne(id: string): Promise<Blog | null> {
    return this.blogModel.findById(id).exec();
  }

  async update(id: string, updateBlogDto: any): Promise<Blog | null> {
    // If tags are being updated, process them
    if (updateBlogDto.tags && updateBlogDto.tags.length > 0) {
      await this.tagsService.addTagsIfNotExist(updateBlogDto.tags);
    }
    
    return this.blogModel
      .findByIdAndUpdate(id, updateBlogDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<Blog | null> {
    return this.blogModel.findByIdAndDelete(id).exec();
  }

  async like(blogId: string, userId: string): Promise<Blog> {
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