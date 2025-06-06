import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export class SocialLinks {
  @Prop()
  facebook?: string;

  @Prop()
  linkedin?: string;

  @Prop()
  github?: string;

  @Prop()
  twitter?: string;

  @Prop()
  instagram?: string;

  @Prop()
  youtube?: string;

  @Prop()
  tiktok?: string;

  @Prop()
  website?: string;
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  title?: string;

  @Prop()
  location?: string;

  @Prop()
  avatar?: string;

  @Prop()
  coverphoto?: string;

  @Prop({ type: Date })
  birthdate?: Date;

  @Prop({ enum: ['He/Him', 'She/Her', 'They/Them'] })
  pronouns?: string;

  @Prop()
  bio?: string;

  @Prop({ default: false })
  onboardingCompleted?: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [String], default: ['user'] })
  roles: string[];

  @Prop({ type: [String], default: [] })
  preferredTags: string[]; // Stores tag names instead of IDs to avoid conflicts when adding existing tags

  @Prop({ type: SocialLinks, default: {} })
  socials: SocialLinks;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  following: User[]; // Users that this user is following

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  followers: User[]; // Users that follow this user

  posts?: number; // Virtual field for posts count
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add virtual field for posts count
UserSchema.virtual('posts', {
  ref: 'Blog',
  localField: '_id',
  foreignField: 'author',
  count: true,
});

// Ensure virtuals are included in JSON
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });
