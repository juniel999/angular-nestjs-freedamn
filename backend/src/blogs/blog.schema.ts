import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Model } from 'mongoose';
import { User } from '../users/user.schema';

@Schema({ timestamps: true })
export class Blog extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ type: Object, required: true })
  content: any; // Store Delta format

  @Prop({ required: true })
  contentHtml: string; // Store HTML version

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  author: User;

  @Prop({ default: false })
  published: boolean;

  @Prop()
  coverImage?: string;

  @Prop({ type: [String], default: [] })
  images: string[]; // Array of Cloudinary image URLs

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  likes: User[];
}

// Define interface for Blog model with static methods
export interface BlogModel extends Model<Blog> {
  generateSlug(title: string): string;
}

export const BlogSchema = SchemaFactory.createForClass(Blog);

// Static method to generate slug from title
BlogSchema.statics.generateSlug = function(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Add pre-save hook to generate slug
BlogSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = (this.constructor as any).generateSlug(this.title);
  }
  next();
});

// Add virtual property for comments
BlogSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'blogId',
});

// Ensure virtuals are included when converting to JSON
BlogSchema.set('toJSON', { virtuals: true });
BlogSchema.set('toObject', { virtuals: true });
