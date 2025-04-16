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
  Param
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { TagsService } from '../tags/tags.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private tagsService: TagsService
  ) {}

  // This route is protected by JWT authentication
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    return req.user;
  }

  // Add an endpoint to update preferred tags
  @UseGuards(JwtAuthGuard)
  @Patch('me/tags')
  async updateMyTags(@Body() body: { tags: string[] }, @Request() req) {
    console.log(`[updateMyTags] Raw request body:`, body);
    
    // Make sure we have valid tags
    const validTags = body.tags?.filter(tag => tag !== null && tag !== undefined && tag.trim() !== '') || [];
    console.log(`[updateMyTags] Valid tags after filtering:`, validTags);
    
    // Normalize tag names (lowercase, trimmed)
    const normalizedTags = validTags.map(tag => tag.toLowerCase().trim());
    
    console.log(`[updateMyTags] Updating tags for user ${req.user._id}:`, normalizedTags);
    
    // Get the user's current tags before updating
    const currentUser = await this.usersService.findById(req.user._id);
    console.log(`[updateMyTags] User's current tags:`, currentUser?.preferredTags || []);
    
    // Update user's preferred tags
    const result = await this.usersService.updatePreferredTags(req.user._id, normalizedTags);
    console.log(`[updateMyTags] Tags after update:`, result?.preferredTags || []);
    
    return result;
  }

  // Add an endpoint to get all available tags for user selection
  @Get('tags/available')
  getAvailableTags() {
    return this.tagsService.findAll();
  }

  // Update user profile
  @UseGuards(JwtAuthGuard)
  @Patch('me/profile')
  updateProfile(@Body() updateProfileDto: UpdateProfileDto, @Request() req) {
    return this.usersService.updateProfile(req.user.userId, updateProfileDto);
  }

  // Get user profile by ID
  @UseGuards(JwtAuthGuard)
  @Get(':id/profile')
  getUserProfile(@Param('id') id: string) {
    return this.usersService.getUserProfile(id);
  }

  // Upload avatar
  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(
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
    return this.usersService.updateAvatar(req.user._id, file);
  }

  // Upload avatar for specific user
  @UseGuards(JwtAuthGuard)
  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadUserAvatar(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 2 }), // 2MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File
  ) {
    return this.usersService.updateAvatar(id, file);
  }

  // Upload cover photo
  @UseGuards(JwtAuthGuard)
  @Post('me/coverphoto')
  @UseInterceptors(FileInterceptor('file'))
  uploadCoverPhoto(
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
    return this.usersService.updateCoverPhoto(req.user._id, file);
  }

  // Upload cover photo for specific user
  @UseGuards(JwtAuthGuard)
  @Post(':id/cover-photo')
  @UseInterceptors(FileInterceptor('file'))
  uploadUserCoverPhoto(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File
  ) {
    return this.usersService.updateCoverPhoto(id, file);
  }

  // Update tags for specific user
  @UseGuards(JwtAuthGuard)
  @Post(':id/tags')
  async updateUserTags(
    @Param('id') id: string,
    @Body() body: { tags: string[] }
  ) {
    console.log(`[updateUserTags] Raw request body:`, body);
    
    // Make sure we have valid tags
    const validTags = body.tags?.filter(tag => tag !== null && tag !== undefined && tag.trim() !== '') || [];
    console.log(`[updateUserTags] Valid tags after filtering:`, validTags);
    
    // Normalize tag names (lowercase, trimmed)
    const normalizedTags = validTags.map(tag => tag.toLowerCase().trim());
    
    console.log(`[updateUserTags] Updating tags for user ${id}:`, normalizedTags);
    
    // Get the user's current tags before updating
    const currentUser = await this.usersService.findById(id);
    console.log(`[updateUserTags] User's current tags:`, currentUser?.preferredTags || []);
    
    // Update user's preferred tags
    const result = await this.usersService.updatePreferredTags(id, normalizedTags);
    console.log(`[updateUserTags] Tags after update:`, result?.preferredTags || []);
    
    return result;
  }

  // Get tags for specific user
  @UseGuards(JwtAuthGuard)
  @Get(':id/tags')
  getUserTags(@Param('id') id: string) {
    return this.usersService.getUserTags(id);
  }

  // Get onboarding status
  @UseGuards(JwtAuthGuard)
  @Get(':id/onboarding-status')
  getOnboardingStatus(@Param('id') id: string) {
    return this.usersService.getOnboardingStatus(id);
  }

  // Complete onboarding
  @UseGuards(JwtAuthGuard)
  @Post(':id/complete-onboarding')
  completeOnboarding(@Param('id') id: string) {
    return this.usersService.completeOnboarding(id);
  }
}
