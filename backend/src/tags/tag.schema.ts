import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Tag extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop({ default: false })
  featured: boolean;
}

export const TagSchema = SchemaFactory.createForClass(Tag); 