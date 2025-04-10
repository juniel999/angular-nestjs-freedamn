import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, SocialLinks } from './user.schema';
import * as bcrypt from 'bcrypt';
import { TagsService } from '../tags/tags.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private tagsService: TagsService
  ) {}

  async findOne(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async updatePreferredTags(userId: string, tagNames: string[]): Promise<User | null> {
    // Process the tags first
    if (tagNames && tagNames.length > 0) {
      await this.tagsService.addTagsIfNotExist(tagNames);
    }
    
    // Update the user's preferred tags
    return this.userModel.findByIdAndUpdate(
      userId,
      { preferredTags: tagNames.map(tag => tag.toLowerCase().trim()) },
      { new: true }
    ).exec();
  }

  async create(
    username: string, 
    email: string, 
    password: string,
    firstName: string,
    lastName: string,
    preferredTags?: string[],
    socials?: SocialLinks
  ): Promise<User> {
    // Check if required fields are provided
    if (!firstName || !lastName) {
      throw new BadRequestException('First name and last name are required');
    }

    // Check if user already exists
    const existingUser = await this.findOne(username);
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const existingEmail = await this.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Process preferred tags if provided
    if (preferredTags && preferredTags.length > 0) {
      await this.tagsService.addTagsIfNotExist(preferredTags);
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = new this.userModel({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      preferredTags: preferredTags ? preferredTags.map(tag => tag.toLowerCase().trim()) : [],
      isActive: true,
      roles: ['user'],
      socials: socials || {}
    });

    return newUser.save();
  }
}
