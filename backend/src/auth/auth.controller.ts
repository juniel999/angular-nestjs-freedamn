import {
  Controller,
  Request,
  Post,
  UseGuards,
  Body,
  Get,
  BadRequestException,
  ValidationPipe,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GoogleAuthGuard } from './google-auth.guard';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from 'src/users/dto/change-pw.dto';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return await this.authService.login(req.user);
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(
      createUserDto.username,
      createUserDto.email,
      createUserDto.password,
      createUserDto.firstName,
      createUserDto.lastName,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Body(new ValidationPipe({ whitelist: true }))
    changePasswordDto: ChangePasswordDto,
    @Request() req,
  ) {
    if (!req.user?.userId) {
      throw new BadRequestException('User not authenticated');
    }

    if (
      !changePasswordDto ||
      !changePasswordDto.oldPassword ||
      !changePasswordDto.newPassword
    ) {
      throw new BadRequestException(
        'Old password and new password are required',
      );
    }

    try {
      return await this.authService.changePassword(
        req.user.userId,
        changePasswordDto.oldPassword,
        changePasswordDto.newPassword,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Req() req) {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    try {
      if (!req.user) {
        throw new BadRequestException('No user data received from Google');
      }

      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      if (!frontendUrl) {
        throw new Error('Frontend URL not configured');
      }

      const { access_token } = req.user;
      if (!access_token) {
        return res.redirect(
          `${frontendUrl}/auth-callback?error=${encodeURIComponent('No access token received')}`,
        );
      }

      // Redirect to frontend auth-callback route with the token
      return res.redirect(`${frontendUrl}/auth-callback?token=${access_token}`);
    } catch (error) {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      if (!frontendUrl) {
        console.error('Frontend URL not configured');
        return res.status(500).json({ message: 'Internal server error' });
      }

      const errorMessage = error.message || 'Authentication failed';
      return res.redirect(
        `${frontendUrl}/auth-callback?error=${encodeURIComponent(errorMessage)}`,
      );
    }
  }
}
