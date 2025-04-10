import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Blog, BlogSchema } from './blog.schema';
import { BlogsService } from './blogs.service';
import { BlogsController } from './blogs.controller';
import { TagsModule } from '../tags/tags.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Blog.name, schema: BlogSchema }
    ]),
    TagsModule
  ],
  controllers: [BlogsController],
  providers: [BlogsService],
  exports: [BlogsService]
})
export class BlogsModule {} 