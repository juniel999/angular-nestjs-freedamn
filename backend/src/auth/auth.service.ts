import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SocialLinks } from '../users/user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { 
      username: user.username, 
      sub: user._id,
      roles: user.roles 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(
    username: string, 
    email: string, 
    password: string,
    firstName: string,
    lastName: string,
    socials?: SocialLinks
  ) {
    // Check if required fields are present
    if (!username || !email || !password || !firstName || !lastName) {
      throw new BadRequestException('All fields are required: username, email, password, firstName, lastName');
    }

    try {
      // Create new user
      const user = await this.usersService.create(username, email, password, firstName, lastName, socials);
      const userObject = user.toObject();
      const { password: _, ...result } = userObject;
      
      return result;
    } catch (error) {
      if (error.message.includes('Username already exists') || 
          error.message.includes('Email already registered')) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }
}
