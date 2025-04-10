import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpStatus, HttpException, BadRequestException } from '@nestjs/common';
import { TagsService } from './tags.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  findAll() {
    return this.tagsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const tag = await this.tagsService.findOne(id);
    if (!tag) {
      throw new HttpException('Tag not found', HttpStatus.NOT_FOUND);
    }
    return tag;
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createTagDto: { name: string }) {
    if (!createTagDto.name) {
      throw new BadRequestException('Tag name is required');
    }
    return this.tagsService.create(createTagDto.name);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bulk')
  addTagsIfNotExist(@Body() body: { tags: string[] }) {
    if (!body.tags || !Array.isArray(body.tags) || body.tags.length === 0) {
      throw new BadRequestException('Tags array is required and must not be empty');
    }
    return this.tagsService.addTagsIfNotExist(body.tags);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateTagDto: any) {
    // Validate that the DTO is not empty
    if (Object.keys(updateTagDto).length === 0) {
      throw new BadRequestException('Update data is required');
    }
    
    const tag = await this.tagsService.update(id, updateTagDto);
    if (!tag) {
      throw new HttpException('Tag not found', HttpStatus.NOT_FOUND);
    }
    return tag;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const tag = await this.tagsService.remove(id);
    if (!tag) {
      throw new HttpException('Tag not found', HttpStatus.NOT_FOUND);
    }
    return tag;
  }
} 