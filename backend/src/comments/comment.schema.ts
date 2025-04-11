import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../users/user.schema';
import { Blog } from '../blogs/blog.schema';

@Schema({ timestamps: true })
export class Comment extends Document {
  @Prop({ required: true })
  content: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Blog', required: true })
  blogId: Blog;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'User', default: [] })
  likes: Types.ObjectId[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Comment', default: null })
  parentId: Comment | null;

  @Prop({ default: 0 })
  replyCount: number;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// Add virtual property for users who liked the comment
CommentSchema.virtual('likedBy', {
  ref: 'User',
  localField: 'likes',
  foreignField: '_id',
});

// Add virtual property for replies
CommentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
});

// Ensure virtuals are included when converting to JSON
CommentSchema.set('toJSON', { virtuals: true });
CommentSchema.set('toObject', { virtuals: true }); 