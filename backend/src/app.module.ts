import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BlogsModule } from './blogs/blogs.module';
import { TagsModule } from './tags/tags.module';
import { CommentsModule } from './comments/comments.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { CloudinaryModule } from './common/cloudinary/cloudinary.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot('mongodb+srv://junieldev:invokersucks2@cluster0.e5bz1.mongodb.net/freedamnv2?retryWrites=true&w=majority&appName=Cluster0'),
    MulterModule.register({
      dest: './uploads',
    }),
    UsersModule, 
    AuthModule,
    BlogsModule,
    TagsModule,
    CommentsModule,
    CloudinaryModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
