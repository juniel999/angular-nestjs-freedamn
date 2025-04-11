import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('blog/:blogId')
  findAllByBlogId(@Param('blogId') blogId: string) {
    return this.commentsService.findAllByBlogId(blogId);
  }

  @Get(':id/replies')
  getReplies(@Param('id') id: string) {
    return this.commentsService.getReplies(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createCommentDto: CreateCommentDto, @Request() req) {
    return this.commentsService.create(createCommentDto, req.user.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req,
  ) {
    return this.commentsService.update(id, updateCommentDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req) {
    return this.commentsService.remove(id, req.user.userId);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  likeComment(@Param('id') id: string, @Request() req) {
    return this.commentsService.likeComment(id, req.user.userId);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  unlikeComment(@Param('id') id: string, @Request() req) {
    return this.commentsService.unlikeComment(id, req.user.userId);
  }
} 