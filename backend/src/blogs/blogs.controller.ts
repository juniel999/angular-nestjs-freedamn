import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createBlogDto: any, @Request() req) {
    return this.blogsService.create(createBlogDto, req.user);
  }

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: string
  ) {
    return this.blogsService.findAll(
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 10,
      sort || 'newest'
    );
  }

  @Get('tag/:tag')
  findByTag(@Param('tag') tag: string) {
    return this.blogsService.findByTag(tag);
  }

  @Get('featured')
  findFeatured() {
    return this.blogsService.findFeatured();
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.blogsService.findByUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('feed')
  getUserFeed(@Request() req) {
    return this.blogsService.findUserFeedByTags(req.user.preferredTags);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blogsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBlogDto: any) {
    return this.blogsService.update(id, updateBlogDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blogsService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  like(@Param('id') id: string, @Request() req) {
    const userId = req.user._id || req.user.userId;
    return this.blogsService.like(id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/like')
  unlike(@Param('id') id: string, @Request() req) {
    const userId = req.user._id || req.user.userId;
    return this.blogsService.unlike(id, userId);
  }
} 