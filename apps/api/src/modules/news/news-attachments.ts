import { randomUUID } from 'node:crypto';
import { mkdirSync, rm } from 'node:fs';
import { join } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import type { FileFilterCallback, Options } from 'multer';

export type NewsAttachmentKind = 'image' | 'video' | 'document';

export type NewsAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  kind: NewsAttachmentKind;
};

const MAX_FILES = 8;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const MIME_TYPE_EXTENSIONS = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
  ['video/mp4', '.mp4'],
  ['video/webm', '.webm'],
  ['video/quicktime', '.mov'],
  ['application/pdf', '.pdf'],
  ['application/msword', '.doc'],
  [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.docx',
  ],
  ['application/vnd.ms-excel', '.xls'],
  [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xlsx',
  ],
  ['application/vnd.ms-powerpoint', '.ppt'],
  [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.pptx',
  ],
  ['text/plain', '.txt'],
  ['text/csv', '.csv'],
]);

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
]);

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
]);

type UploadedFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

export function getUploadsRoot() {
  return process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');
}

export function getNewsUploadsDir() {
  return join(getUploadsRoot(), 'news');
}

export function ensureNewsUploadsDir() {
  mkdirSync(getNewsUploadsDir(), { recursive: true });
}

export function getNewsUploadOptions(): Options {
  ensureNewsUploadsDir();

  return {
    storage: diskStorage({
      destination: getNewsUploadsDir(),
      filename: (_request, file, callback) => {
        const extension = MIME_TYPE_EXTENSIONS.get(file.mimetype) ?? '';
        callback(null, `${randomUUID()}${extension}`);
      },
    }),
    limits: {
      files: MAX_FILES,
      fileSize: MAX_FILE_SIZE,
    },
    fileFilter: (_request, file, callback: FileFilterCallback) => {
      if (getAttachmentKind(file.mimetype)) {
        callback(null, true);
        return;
      }

      callback(
        new BadRequestException(
          'Можно загружать только фото, видео и офисные документы',
        ),
      );
    },
  };
}

export function mapNewsAttachments(files: UploadedFile[] = []) {
  return files.map<NewsAttachment>((file) => ({
    id: randomUUID(),
    name: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: `${getPublicUploadsBaseUrl()}/news/${file.filename}`,
    kind: getAttachmentKind(file.mimetype) ?? 'document',
  }));
}

export function deleteNewsAttachmentFiles(attachments: unknown) {
  if (!Array.isArray(attachments)) {
    return;
  }

  for (const attachment of attachments) {
    const fileName = getAttachmentFileName(attachment);

    if (!fileName) {
      continue;
    }

    rm(join(getNewsUploadsDir(), fileName), { force: true }, () => undefined);
  }
}

function getAttachmentKind(mimeType: string): NewsAttachmentKind | null {
  if (IMAGE_MIME_TYPES.has(mimeType)) {
    return 'image';
  }

  if (VIDEO_MIME_TYPES.has(mimeType)) {
    return 'video';
  }

  if (DOCUMENT_MIME_TYPES.has(mimeType)) {
    return 'document';
  }

  return null;
}

function getPublicUploadsBaseUrl() {
  return process.env.PUBLIC_UPLOADS_BASE_URL ?? '/api/uploads';
}

function getAttachmentFileName(attachment: unknown) {
  if (
    !attachment ||
    typeof attachment !== 'object' ||
    !('url' in attachment) ||
    typeof attachment.url !== 'string'
  ) {
    return null;
  }

  const fileName = attachment.url.split('/').pop();
  return fileName && !fileName.includes('..') ? fileName : null;
}
