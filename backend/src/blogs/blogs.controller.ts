import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

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
    @Query('sort') sort?: string,
    @Query('filter') filter?: string
  ) {
    return this.blogsService.findAll(
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 10,
      sort || 'newest',
      filter
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
  @Get('for-you')
  forYou(
    @Request() req,
    @Query('page') page?: number,
    @Query('tags') tags?: string
  ) {

    const userTags = tags ? tags.split(',') : req.user.preferredTags;

    console.log('this is the usertags',userTags);
    return this.blogsService.findUserFeedByTags(
      userTags,
      page ? parseInt(page.toString()) : 1
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('explore')
  explore(@Query('page') page?: number) {
    return this.blogsService.findRandomBlogs(
      page ? parseInt(page.toString()) : 1
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('following')
  following(
    @Request() req,
    @Query('page') page?: number
  ) {
    return this.blogsService.findBlogsByFollowedAuthors(
      req.user._id || req.user.userId,
      page ? parseInt(page.toString()) : 1
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File
  ) {
    return this.blogsService.uploadImage(file);
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