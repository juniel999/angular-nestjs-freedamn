import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, SocialLinks } from './user.schema';
import { Blog } from '../blogs/blog.schema';
import * as bcrypt from 'bcrypt';
import { TagsService } from '../tags/tags.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSocialsDto } from './dto/update-socials.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Blog.name) private blogModel: Model<Blog>,
    private tagsService: TagsService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async findOne(username: string): Promise<User | null> {
    // Try case-insensitive match
    try {
      const user = await this.userModel
        .findOne({
          username: { $regex: new RegExp(`^${username}$`, 'i') },
        })
        .exec();

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

  async updatePreferredTags(
    userId: string,
    tagIds: string[],
  ): Promise<User | null> {
    // Filter out any null, undefined or empty values and normalize tag names
    const normalizedTagNames = tagIds
      .filter((tag) => tag !== null && tag !== undefined && tag.trim() !== '')
      .map((tag) => tag.toLowerCase().trim());

    // Update the user's preferred tags with normalized tag names
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { preferredTags: normalizedTagNames },
        { new: true },
      )
      .exec();
  }

  async create(
    username: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
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
      socials: {},
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
    const newAvatarUrl = await this.cloudinaryService.uploadImage(
      file,
      'user-avatars',
    );

    // Update user with new avatar URL
    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, { avatar: newAvatarUrl }, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(
        `User with id ${userId} not found after update`,
      );
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

  async updateCoverPhoto(
    userId: string,
    file: Express.Multer.File,
  ): Promise<User> {
    // Find the user first to get the current cover photo URL
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // Upload new image to Cloudinary
    const newCoverPhotoUrl = await this.cloudinaryService.uploadImage(
      file,
      'user-coverphoto',
    );

    // Update user with new cover photo URL
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { coverphoto: newCoverPhotoUrl },
        { new: true },
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(
        `User with id ${userId} not found after update`,
      );
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

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, updateProfileDto, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    return updatedUser;
  }

  async getUserProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .exec();
    if (!user) {
      throw new Error('User not found');
    }

    return {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      pronouns: user.pronouns,
      title: user.title,
      location: user.location,
      birthdate: user.birthdate,
      bio: user.bio,
      socials: user.socials,
      avatar: user.avatar,
      coverphoto: user.coverphoto,
      roles: user.roles,
      isActive: user.isActive,
    };
  }

  async getOnboardingStatus(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new Error('User not found');
    }

    // Only consider onboarding complete if the user has explicitly completed it
    // (not just by having enough tags)
    return { completed: user.onboardingCompleted === true };
  }

  async completeOnboarding(userId: string) {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { onboardingCompleted: true }, { new: true })
      .exec();
    return { completed: true };
  }

  async getUserTags(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new Error('User not found');
    }

    return { tags: user.preferredTags || [] };
  }

  async updatePassword(userId: string, hashedPassword: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });
  }

  // NEW METHODS FOR USER PROFILE PAGE

  // Get a user's posts
  async getUserPosts(userId: string) {
    const posts = await this.blogModel
      .find({ author: userId, published: true })
      .sort({ createdAt: -1 })
      .populate('author', 'username firstName lastName avatar')
      .exec();

    return {
      posts,
      count: posts.length,
    };
  }

  // Get a user's saved posts - This would depend on your Blog/Post implementation
  // We'll mock this for now
  async getUserSavedPosts(userId: string) {
    // This would typically include a lookup to a saved posts collection
    // For now, return mock data
    return {
      posts: [],
      count: 0,
    };
  }

  // Get a user's followers
  async getUserFollowers(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .populate('following', '-password')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    return {
      followers: [user.followers || []],
      count: user.followers?.length || 0,
    };
  }

  // Get users that a user is following
  async getUserFollowing(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .populate('following', '-password')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    return {
      following: user.following || [],
      count: user.following?.length || 0,
    };
  }

  // Get a user's social links
  async getUserSocials(userId: string) {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    return user.socials || {};
  }

  // Update a user's social links
  async updateUserSocials(userId: string, updateSocialsDto: UpdateSocialsDto) {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { socials: updateSocialsDto.socials },
        { new: true },
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    return updatedUser.socials;
  }

  async getUserStats(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new Error('User not found');
    }

    const [postsCount, followersCount, followingCount] = await Promise.all([
      this.blogModel.countDocuments({ author: userId }).exec(),
      this.userModel.countDocuments({ following: userId }).exec(),
      user.following?.length || 0,
    ]);

    return {
      postsCount,
      followersCount,
      followingCount,
    };
  }

  // Follow a user
  async followUser(followerId: string, targetUserId: string) {
    if (followerId === targetUserId) {
      throw new BadRequestException('Users cannot follow themselves');
    }

    const [follower, targetUser] = await Promise.all([
      this.userModel.findById(followerId),
      this.userModel.findById(targetUserId),
    ]);

    if (!follower || !targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if already following
    const isAlreadyFollowing = follower.following?.some(
      (followedUser: User) => followedUser?._id?.toString() === targetUserId,
    );

    if (isAlreadyFollowing) {
      throw new BadRequestException('Already following this user');
    }

    // Initialize following array if it doesn't exist
    if (!follower.following) {
      follower.following = [];
    }

    // Initialize followers array if it doesn't exist
    if (!targetUser.followers) {
      targetUser.followers = [];
    }

    // Add targetUser to follower's following list
    follower.following.push(targetUser);
    // Add follower to targetUser's followers list
    targetUser.followers.push(follower);

    // Save both users
    await Promise.all([follower.save(), targetUser.save()]);

    return {
      success: true,
      following: true,
    };
  }

  // Unfollow a user
  async unfollowUser(followerId: string, targetUserId: string) {
    const [follower, targetUser] = await Promise.all([
      this.userModel.findById(followerId),
      this.userModel.findById(targetUserId),
    ]);

    if (!follower || !targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if actually following
    const isFollowing = follower.following?.some(
      (followedUser: User) => followedUser?._id?.toString() === targetUserId,
    );

    if (!isFollowing) {
      throw new BadRequestException('Not following this user');
    }

    // Remove from follower's following list
    follower.following = follower.following.filter(
      (followedUser: User) => followedUser?._id?.toString() !== targetUserId,
    );

    // Remove from targetUser's followers list
    targetUser.followers = targetUser.followers.filter(
      (followerUser: User) => followerUser?._id?.toString() !== followerId,
    );

    // Save both users
    await Promise.all([follower.save(), targetUser.save()]);

    return {
      success: true,
      following: false,
    };
  }

  // Check if user is following another user
  async isFollowing(userId: string, targetUserId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      return false;
    }

    return (
      user.following?.some(
        (followedUser: User) => followedUser?._id?.toString() === targetUserId,
      ) || false
    );
  }
}
