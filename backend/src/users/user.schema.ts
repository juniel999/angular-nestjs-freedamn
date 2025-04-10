import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [String], default: ['user'] })
  roles: string[];

  @Prop({ type: [String], default: [] })
  preferredTags: string[];

  @Prop({ type: SocialLinks, default: {} })
  socials: SocialLinks;
}

export const UserSchema = SchemaFactory.createForClass(User); 