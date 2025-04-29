import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { TagsService } from '../tags/tags.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSocialsDto } from './dto/update-socials.dto';
import { UpdateLikedTagsDto } from './dto/update-liked-tags.dto';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private tagsService: TagsService,
  ) {}

  // Protected routes (require authentication)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/tags')
  async updateMyTags(@Body() body: { tags: string[] }, @Request() req) {
    return this.usersService.updatePreferredTags(req.user.userId, body.tags);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/profile')
  updateProfile(@Body() updateProfileDto: UpdateProfileDto, @Request() req) {
    return this.usersService.updateProfile(req.user.userId, updateProfileDto);
  }

  // Public routes (no authentication required)
  @Get('tags/available')
  getAvailableTags() {
    return this.tagsService.findAll();
  }

  @Get(':id/profile')
  getUserProfile(@Param('id') id: string) {
    return this.usersService.getUserProfile(id);
  }

  @Get(':id/posts')
  getUserPosts(@Param('id') id: string) {
    return this.usersService.getUserPosts(id);
  }

  @Get(':id/tags')
  getUserTags(@Param('id') id: string) {
    return this.usersService.getUserTags(id);
  }

  @Get(':id/stats')
  getUserStats(@Param('id') id: string) {
    return this.usersService.getUserStats(id);
  }

  // Protected routes for profile management
  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 2 }), // 2MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Request() req,
  ) {
    return this.usersService.updateAvatar(req.user.userId, file);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/coverphoto')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCoverPhoto(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Request() req,
  ) {
    return this.usersService.updateCoverPhoto(req.user.userId, file);
  }

  // Onboarding related routes (protected)
  @UseGuards(JwtAuthGuard)
  @Get(':id/onboarding-status')
  getOnboardingStatus(@Param('id') id: string) {
    return this.usersService.getOnboardingStatus(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/complete-onboarding')
  completeOnboarding(@Param('id') id: string) {
    return this.usersService.completeOnboarding(id);
  }

  // Following/Followers management (protected)
  @UseGuards(JwtAuthGuard)
  @Get(':id/saved-posts')
  getUserSavedPosts(@Param('id') id: string) {
    return this.usersService.getUserSavedPosts(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/followers')
  getUserFollowers(@Param('id') id: string) {
    return this.usersService.getUserFollowers(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/following')
  getUserFollowing(@Param('id') id: string) {
    return this.usersService.getUserFollowing(id);
  }

  // Social links (protected updates, public viewing)
  @Get(':id/socials')
  getUserSocials(@Param('id') id: string) {
    return this.usersService.getUserSocials(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/socials')
  updateUserSocials(
    @Param('id') id: string,
    @Body() updateSocialsDto: UpdateSocialsDto,
  ) {
    return this.usersService.updateUserSocials(id, updateSocialsDto);
  }

  // Find user by username (public)
  @Get('find/:username')
  async findByUsername(@Param('username') username: string) {
    const user = await this.usersService.findOne(username);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, ...result } = user.toObject();
    return result;
  }
}
