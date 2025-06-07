import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/user.schema';
import { Document, Types } from 'mongoose';

type UserType = {
  userId: string;
  username: string;
  roles: string[];
};

interface OAuthUser {
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
  accessToken: string;
}

interface UserDocument extends User, Document {
  _id: Types.ObjectId;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    // Find user by username, case-insensitive
    const user = await this.usersService.findOne(username);

    if (!user) {
      return null;
    }

    // Use bcrypt to compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      // If validation is successful, remove password from the returned object
      const { password, ...result } = user.toObject();
      return result;
    }

    return null;
  }

  async login(user: any) {
    // Create JWT payload
    const payload = {
      username: user.username,
      sub: user._id.toString(), // Ensure we're using string version of _id
      roles: user.roles,
      preferredTags: user.preferredTags || [],
      firstName: user.firstName,
    };

    // Get the complete user profile
    const fullUser = await this.usersService.getUserProfile(
      user._id.toString(),
    );

    // Return JWT token and user data
    return {
      ...fullUser,
      sub: user._id.toString(),
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(
    username: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) {
    // Check if required fields are present
    if (!username || !email || !password || !firstName || !lastName) {
      throw new BadRequestException(
        'All fields are required: username, email, password, firstName, lastName',
      );
    }

    try {
      // Create new user with only required fields
      const user = await this.usersService.create(
        username,
        email,
        password,
        firstName,
        lastName,
      );
      const userObject = user.toObject();
      const { password: _, ...result } = userObject;

      return result;
    } catch (error) {
      if (
        error.message.includes('Username already exists') ||
        error.message.includes('Email already registered')
      ) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }

  // return user profile without password
  async getProfile(user: UserType): Promise<Omit<UserType, 'password'> | null> {
    const userProfile = await this.usersService.findById(user.userId);
    if (!userProfile) {
      return null;
    }
    const { password, ...result } = userProfile.toObject();
    return result;
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    if (!userId || !oldPassword || !newPassword) {
      throw new BadRequestException('Missing required password data');
    }

    try {
      const user = await this.usersService.findById(userId);
      if (!user || !user.password) {
        throw new UnauthorizedException('User not found');
      }

      // Ensure both password strings exist before comparing
      const isPasswordValid =
        oldPassword && user.password
          ? await bcrypt.compare(oldPassword, user.password)
          : false;

      if (!isPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      if (newPassword.length < 8) {
        throw new BadRequestException(
          'New password must be at least 8 characters long',
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.usersService.updatePassword(userId, hashedPassword);

      return { message: 'Password updated successfully' };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to change password: ' + error.message,
      );
    }
  }

  async validateOAuthUser(oauthUser: OAuthUser): Promise<any> {
    try {
      // Check if user exists with this email
      let user = (await this.usersService.findByEmail(
        oauthUser.email,
      )) as UserDocument | null;

      if (!user) {
        // Create new user if doesn't exist
        const baseUsername = oauthUser.firstName
          .toLowerCase()
          .replace(/\s+/g, '');
        let username = baseUsername;
        let counter = 1;

        // Keep trying until we find a unique username
        while (await this.usersService.findOne(username)) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        // Generate a secure random password for OAuth users
        const password = crypto.randomBytes(16).toString('hex');

        user = (await this.usersService.create(
          username,
          oauthUser.email,
          password,
          oauthUser.firstName,
          oauthUser.lastName,
        )) as UserDocument;
      }

      if (!user) {
        throw new BadRequestException('Failed to create or find user');
      }

      // If the user has a profile picture from Google and it's a new user
      if (oauthUser.picture) {
        await this.usersService.updateAvatar(user.id, oauthUser.picture);
        const updatedUser = (await this.usersService.findById(
          user.id,
        )) as UserDocument;
        if (updatedUser) {
          user = updatedUser;
        }
      }

      // Create JWT payload
      const payload = {
        username: user.username,
        sub: user._id.toString(), // Ensure we're using string version of _id
        roles: user.roles || ['user'],
        preferredTags: user.preferredTags || [],
        firstName: user.firstName,
      };

      // Get the complete user object with virtuals populated
      const fullUser = await this.usersService.getUserProfile(
        user._id.toString(),
      );

      // Return user data with access token
      return {
        ...fullUser,
        sub: user._id.toString(), // Explicitly include sub in the response
        access_token: this.jwtService.sign(payload),
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to authenticate with Google: ' + error.message,
      );
    }
  }
}
