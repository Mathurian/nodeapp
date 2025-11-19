import { User, Judge, Contestant } from '@prisma/client';
import { Logger } from 'winston';

declare global {
  namespace Express {
    interface Request {
      user?: User & {
        judge?: Judge | null;
        contestant?: Contestant | null;
      };
      validationData?: Record<string, unknown>;
      fileInfo?: {
        filename: string;
        originalName: string;
        size: number;
        mimeType: string;
        path: string;
      };
      requestId?: string;
      logger?: Logger;
      csrfToken?: string;
      id?: string;
      tenantId?: string;
    }
  }
}

export {};
