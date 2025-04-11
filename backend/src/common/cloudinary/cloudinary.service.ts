import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(file: Express.Multer.File, folder: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) return reject(error);
          if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error('Upload failed'));
          }
        }
      );
      
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
  
  async deleteImageByUrl(imageUrl: string): Promise<boolean> {
    try {
      // Extract public_id from the Cloudinary URL
      // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.ext
      if (!imageUrl) return false;
      
      const urlParts = imageUrl.split('/');
      // Get the filename with extension from the URL
      const filenameWithExt = urlParts[urlParts.length - 1];
      // Remove the file extension to get the public_id
      const publicId = filenameWithExt.split('.')[0];
      
      // If we have a folder structure in the URL, include it in the public_id
      const folderPath = urlParts[urlParts.length - 2];
      const fullPublicId = `${folderPath}/${publicId}`;
      
      const result = await cloudinary.uploader.destroy(fullPublicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      return false;
    }
  }
} 