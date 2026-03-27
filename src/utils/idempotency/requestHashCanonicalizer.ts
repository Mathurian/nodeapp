import crypto from 'crypto';
import type { Request } from 'express';
import {
  CanonicalFileDescriptor,
  CanonicalIdempotencyRequestInput,
  CanonicalValue,
  canonicalizeIdempotencyRequest as canonicalizeRequest,
  serializeCanonicalIdempotencyRequest,
} from '../../generated/idempotency/requestHashCanonicalizer';

const mapFileDescriptor = (file: Express.Multer.File): CanonicalFileDescriptor => ({
  fieldname: file.fieldname,
  originalname: file.originalname,
  mimetype: file.mimetype,
  size: file.size,
});

const extractFileMetadata = (
  req: Request,
): CanonicalIdempotencyRequestInput['files'] => {
  const singleFile = (req as Request & { file?: Express.Multer.File }).file;
  if (singleFile) {
    return [mapFileDescriptor(singleFile)];
  }

  const files = (req as Request & { files?: Express.Multer.File[] | Record<string, Express.Multer.File[]> }).files;
  if (!files) {
    return null;
  }

  if (Array.isArray(files)) {
    return files.map(mapFileDescriptor);
  }

  return Object.keys(files)
    .sort((left, right) => left.localeCompare(right))
    .reduce<Record<string, CanonicalFileDescriptor[]>>((accumulator, key) => {
      accumulator[key] = (files[key] || []).map(mapFileDescriptor);
      return accumulator;
    }, {});
};

export const canonicalizeIdempotencyRequest = (
  req: Request,
  canonicalPath: string,
): CanonicalValue =>
  canonicalizeRequest({
    method: String(req.method || '').toUpperCase(),
    canonicalPath,
    params: req.params || {},
    query: req.query || {},
    body: req.body || {},
    files: extractFileMetadata(req),
  });

export const buildIdempotencyRequestHash = (req: Request, canonicalPath: string): string => {
  const serialized = serializeCanonicalIdempotencyRequest({
    method: String(req.method || '').toUpperCase(),
    canonicalPath,
    params: req.params || {},
    query: req.query || {},
    body: req.body || {},
    files: extractFileMetadata(req),
  } satisfies CanonicalIdempotencyRequestInput);
  return crypto.createHash('sha256').update(serialized).digest('hex');
};
