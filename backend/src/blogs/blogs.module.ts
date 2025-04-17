import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Blog, BlogSchema } from './blog.schema';
import { BlogsService } from './blogs.service';
import { BlogsController } from './blogs.controller';
import { TagsModule } from '../tags/tags.module';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';
import { UserSchema, User } from '../users/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Blog.name, schema: BlogSchema },
      { name: User.name, schema: UserSchema }
    ]),
    TagsModule,
    CloudinaryModule
  ],
  controllers: [BlogsController],
  providers: [BlogsService],
  exports: [BlogsService]
})
export class BlogsModule {}