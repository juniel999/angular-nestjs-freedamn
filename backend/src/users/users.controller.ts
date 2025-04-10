import { Controller, Get, Patch, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { TagsService } from '../tags/tags.service';

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
}
