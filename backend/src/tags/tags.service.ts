import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Error as MongooseError } from 'mongoose';
import { Tag } from './tag.schema';

@Injectable()
export class TagsService {
  constructor(
    @InjectModel(Tag.name) private tagModel: Model<Tag>
  ) {}

  async findAll(): Promise<Tag[]> {
    return this.tagModel.find().sort({ usageCount: -1 }).exec();
  }

  async findOne(id: string): Promise<Tag | null> {
    return this.tagModel.findById(id).exec();
  }

  async findByName(name: string): Promise<Tag | null> {
    return this.tagModel.findOne({ name: name.toLowerCase().trim() }).exec();
  }

  async create(name: string): Promise<Tag> {
    const existingTag = await this.findByName(name);
    if (existingTag) {
      return existingTag;
    }
    
    const createdTag = new this.tagModel({
      name: name.toLowerCase().trim(),
      usageCount: 1,
    });
    return createdTag.save();
  }

  async addTagsIfNotExist(tagNames: string[]): Promise<Tag[]> {
    const uniqueTagNames = [...new Set(tagNames.map(name => name.toLowerCase().trim()))];
    const tags: Tag[] = [];

    for (const name of uniqueTagNames) {
      let tag = await this.findByName(name);
      
      if (tag) {
        // Increment usage count
        tag = await this.tagModel.findByIdAndUpdate(
          tag._id, 
          { $inc: { usageCount: 1 } },
          { new: true }
        );
      } else {
        // Create new tag
        tag = await this.create(name);
      }
      
      if (tag) {
        tags.push(tag);
      }
    }

    return tags;
  }

  async update(id: string, updateTagDto: any): Promise<Tag | null> {
    try {
      // If updating the name, check if it would create a duplicate
      if (updateTagDto.name) {
        updateTagDto.name = updateTagDto.name.toLowerCase().trim();
        
        // Check if another tag already has this name
        const existingTagWithSameName = await this.tagModel.findOne({
          name: updateTagDto.name,
          _id: { $ne: id }
        });
        
        if (existingTagWithSameName) {
          throw new ConflictException(`Tag with name "${updateTagDto.name}" already exists`);
        }
      }
      
      return await this.tagModel
        .findByIdAndUpdate(id, updateTagDto, { new: true })
        .exec();
    } catch (error) {
      // Handle Mongoose duplicate key error (in case the unique validation kicks in)
      if (error instanceof MongooseError.ValidationError) {
        throw new ConflictException('Tag with this name already exists');
      }
      if (error.name === 'MongoServerError' && error.code === 11000) {
        throw new ConflictException('Tag with this name already exists');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<Tag | null> {
    return this.tagModel.findByIdAndDelete(id).exec();
  }
} 