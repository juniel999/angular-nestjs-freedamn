import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment } from './comment.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
  ) {}

  // Get all comments for a blog
  async findAllByBlogId(blogId: string) {
    if(!Types.ObjectId.isValid(blogId)){
      throw new NotFoundException('Invalid blog ID format');
    }

    return this.commentModel
      .find({ blogId })
      .populate('userId', 'username avatar')
      .populate('likedBy', 'username avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Get a single comment by ID
  async findOne(id: string) {
    if(!Types.ObjectId.isValid(id)){
      throw new NotFoundException('Invalid comment ID format');
    }

    const comment = await this.commentModel
      .findById(id)
      .populate('userId', 'username avatar')
      .populate('likedBy', 'username avatar')
      .exec();
    
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    
    return comment;
  }

  // Create a new comment
  async create(createCommentDto: CreateCommentDto, userId: string) {
    const newComment = new this.commentModel({
      ...createCommentDto,
      userId,
    });
    
    return newComment.save();
  }

  // Update a comment
  async update(id: string, updateCommentDto: UpdateCommentDto, userId: string) {
    if(!Types.ObjectId.isValid(id)){
      throw new NotFoundException('Invalid comment ID format');
    }

    const comment = await this.commentModel.findById(id);
    
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    
    // Check if the user is the owner of the comment
    if (comment.userId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }
    
    return this.commentModel
      .findByIdAndUpdate(id, updateCommentDto, { new: true })
      .exec();
  }

  // Delete a comment
  async remove(id: string, userId: string) {
    if(!Types.ObjectId.isValid(id)){
      throw new NotFoundException('Invalid comment ID format');
    }

    const comment = await this.commentModel.findById(id);
    
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    
    // Check if the user is the owner of the comment
    if (comment.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    
    return this.commentModel.findByIdAndDelete(id).exec();
  }

  // Like a comment
  async likeComment(id: string, userId: string) {
    if(!Types.ObjectId.isValid(id)){
      throw new NotFoundException('Invalid comment ID format');
    }

    const comment = await this.commentModel.findById(id);
    
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    
    // Check if user already liked the comment
    const userIdObj = new Types.ObjectId(userId);
    const hasLiked = comment.likes.some(like => like.toString() === userId);
    if (hasLiked) {
      throw new BadRequestException('You have already liked this comment');
    }
    
    // Add user to likes array
    comment.likes.push(userIdObj);
    return comment.save();
  }

  // Unlike a comment
  async unlikeComment(id: string, userId: string) {
    if(!Types.ObjectId.isValid(id)){
      throw new NotFoundException('Invalid comment ID format');
    }

    const comment = await this.commentModel.findById(id);
    
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    
    // Check if user has liked the comment
    const userIdObj = new Types.ObjectId(userId);
    const hasLiked = comment.likes.some(like => like.toString() === userId);
    if (!hasLiked) {
      throw new BadRequestException('You have not liked this comment');
    }
    
    // Remove user from likes array
    comment.likes = comment.likes.filter(like => like.toString() !== userId);
    return comment.save();
  }
} 