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
  FileTypeValidator 
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
  updateMyTags(@Body() body: { tags: string[] }, @Request() req) {
    return this.usersService.updatePreferredTags(req.user._id, body.tags);
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
    return this.usersService.updateProfile(req.user._id, updateProfileDto);
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
}
