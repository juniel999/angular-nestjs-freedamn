import {
  Controller,
  Request,
  Post,
  UseGuards,
  Body,
  Get,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from 'src/users/dto/change-pw.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
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
}
