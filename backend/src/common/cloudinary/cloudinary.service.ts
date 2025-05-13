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

  async uploadImage(
    file: Express.Multer.File | string,
    folder: string,
  ): Promise<string> {
    if (typeof file === 'string' && file.startsWith('data:image')) {
      // Handle base64 string
      return new Promise<string>((resolve, reject) => {
        cloudinary.uploader.upload(file, { folder }, (error, result) => {
          if (error) return reject(error);
          if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error('Upload failed'));
          }
        });
      });
    } else if (typeof file === 'object') {
      // Handle Multer file
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
          },
        );

        streamifier.createReadStream(file.buffer).pipe(uploadStream);
      });
    } else {
      throw new Error('Invalid file format');
    }
  }

  async deleteImageByUrl(imageUrl: string): Promise<boolean> {
    try {
      if (!imageUrl) return false;

      // Extract public_id from the Cloudinary URL
      // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.ext

      // Get everything after /upload/
      const uploadIndex = imageUrl.indexOf('/upload/');
      if (uploadIndex === -1) return false;

      const pathAfterUpload = imageUrl.slice(uploadIndex + 8);

      // Remove version number if present (v1234567890/)
      const pathWithoutVersion = pathAfterUpload.replace(/v\d+\//, '');

      // Remove file extension
      const publicId = pathWithoutVersion.replace(/\.[^/.]+$/, '');

      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      return false;
    }
  }
}
