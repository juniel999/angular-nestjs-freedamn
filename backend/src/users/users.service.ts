import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, SocialLinks } from './user.schema';
import * as bcrypt from 'bcrypt';
import { TagsService } from '../tags/tags.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private tagsService: TagsService,
    private cloudinaryService: CloudinaryService
  ) {}

  async findOne(username: string): Promise<User | null> {
    // Try case-insensitive match
    try {
      const user = await this.userModel.findOne({ 
        username: { $regex: new RegExp(`^${username}$`, 'i') } 
      }).exec();
      
      if (user) {
        return user;
      }
      
      return null;
    } catch (error) {
      // Fallback to exact match if regex fails
      return this.userModel.findOne({ username }).exec();
    }
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
    lastName: string
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

    // Use a fixed salt round for consistency
    const saltRounds = 10;
    
    // Generate hash with explicit salt rounds
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user with required fields and default values for optional fields
    const newUser = new this.userModel({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      preferredTags: [],
      isActive: true,
      roles: ['user'],
      socials: {}
    });

    return newUser.save();
  }

  async updateAvatar(userId: string, file: Express.Multer.File): Promise<User> {
    // Find the user first to get the current avatar URL
    const user = await this.userModel.findById(userId).exec();
    
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    
    // Upload new image to Cloudinary
    const newAvatarUrl = await this.cloudinaryService.uploadImage(file, 'user-avatars');
    
    // Update user with new avatar URL
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { avatar: newAvatarUrl },
      { new: true }
    ).exec();
    
    if (!updatedUser) {
      throw new NotFoundException(`User with id ${userId} not found after update`);
    }
    
    // Delete the old avatar image if it exists
    if (user.avatar) {
      try {
        await this.cloudinaryService.deleteImageByUrl(user.avatar);
      } catch (error) {
        console.error('Failed to delete old avatar image:', error);
        // Continue execution even if deletion fails
      }
    }
    
    return updatedUser;
  }

  async updateCoverPhoto(userId: string, file: Express.Multer.File): Promise<User> {
    // Find the user first to get the current cover photo URL
    const user = await this.userModel.findById(userId).exec();
    
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    
    // Upload new image to Cloudinary
    const newCoverPhotoUrl = await this.cloudinaryService.uploadImage(file, 'user-coverphoto');
    
    // Update user with new cover photo URL
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { coverphoto: newCoverPhotoUrl },
      { new: true }
    ).exec();
    
    if (!updatedUser) {
      throw new NotFoundException(`User with id ${userId} not found after update`);
    }
    
    // Delete the old cover photo image if it exists
    if (user.coverphoto) {
      try {
        await this.cloudinaryService.deleteImageByUrl(user.coverphoto);
      } catch (error) {
        console.error('Failed to delete old cover photo image:', error);
        // Continue execution even if deletion fails
      }
    }
    
    return updatedUser;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      updateProfileDto,
      { new: true }
    ).exec();
    
    if (!updatedUser) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    
    return updatedUser;
  }
}
