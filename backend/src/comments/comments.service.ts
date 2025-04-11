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

  // Get all top-level comments for a blog
  async findAllByBlogId(blogId: string) {
    if(!Types.ObjectId.isValid(blogId)){
      throw new NotFoundException('Invalid blog ID format');
    }

    return this.commentModel
      .find({ blogId, parentId: null })
      .populate('userId', 'username avatar')
      .populate('likedBy', 'username avatar')
      .populate({
        path: 'replies',
        populate: {
          path: 'userId',
          select: 'username avatar'
        }
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // Get replies for a specific comment
  async getReplies(commentId: string) {
    if(!Types.ObjectId.isValid(commentId)){
      throw new NotFoundException('Invalid comment ID format');
    }

    return this.commentModel
      .find({ parentId: commentId })
      .populate('userId', 'username avatar')
      .populate('likedBy', 'username avatar')
      .sort({ createdAt: 1 })
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
      .populate({
        path: 'replies',
        populate: {
          path: 'userId',
          select: 'username avatar'
        }
      })
      .exec();
    
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    
    return comment;
  }

  // Create a new comment or reply
  async create(createCommentDto: CreateCommentDto, userId: string) {
    if (createCommentDto.parentId) {
      // Check if parent comment exists
      const parentComment = await this.commentModel.findById(createCommentDto.parentId);
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
      
      // Create the reply
      const newReply = new this.commentModel({
        ...createCommentDto,
        userId,
      });
      
      // Increment the parent's reply count
      await this.commentModel.findByIdAndUpdate(
        createCommentDto.parentId,
        { $inc: { replyCount: 1 } }
      );
      
      return newReply.save();
    }
    
    // Create a top-level comment
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

    // If this is a reply, decrement parent's reply count
    if (comment.parentId) {
      await this.commentModel.findByIdAndUpdate(
        comment.parentId,
        { $inc: { replyCount: -1 } }
      );
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