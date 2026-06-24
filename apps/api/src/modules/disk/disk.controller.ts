import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  UseInterceptors, 
  UploadedFile, 
  Param, 
  ParseFilePipe, 
  MaxFileSizeValidator,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { readdirSync, statSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { getUploadsRoot } from '../news/news-attachments';

export function getDiskUploadsDir() {
  return join(getUploadsRoot(), 'disk');
}

export function ensureDiskUploadsDir() {
  const dir = getDiskUploadsDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

@Controller('disk')
export class DiskController {
  constructor() {
    ensureDiskUploadsDir();
  }

  @Get('files')
  getFiles() {
    const dir = getDiskUploadsDir();
    if (!existsSync(dir)) {
      return [];
    }
    const files = readdirSync(dir);
    return files.map(file => {
      const stats = statSync(join(dir, file));
      return {
        name: file,
        size: stats.size,
        url: `/api/uploads/disk/${file}`,
        createdAt: stats.mtime
      };
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        cb(null, ensureDiskUploadsDir());
      },
      filename: (req, file, cb) => {
        // Fix encoding for cyrillic filenames if any
        let filename = Buffer.from(file.originalname, 'latin1').toString('utf8');
        
        // Ensure uniqueness to avoid overwriting
        if (existsSync(join(ensureDiskUploadsDir(), filename))) {
          const ext = extname(filename);
          const name = filename.substring(0, filename.length - ext.length);
          filename = `${name}-${Date.now()}${ext}`;
        }
        cb(null, filename);
      }
    }),
    limits: {
      fileSize: 1024 * 1024 * 1024, // 1GB max file size for the disk
    }
  }))
  uploadFile(@UploadedFile(new ParseFilePipe({
    validators: [
      new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 1024 }),
    ],
    fileIsRequired: true,
  })) file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return { 
      name: file.filename, 
      size: file.size, 
      url: `/api/uploads/disk/${file.filename}` 
    };
  }

  @Delete(':filename')
  deleteFile(@Param('filename') filename: string) {
    if (filename.includes('..') || filename.includes('/')) {
      throw new BadRequestException('Invalid filename');
    }
    
    const filePath = join(ensureDiskUploadsDir(), filename);
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch (err) {
        throw new BadRequestException('Could not delete file');
      }
    }
    return { success: true };
  }
}
