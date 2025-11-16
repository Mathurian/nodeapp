import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User & {
        judge?: any;
        contestant?: any;
      };
      validationData?: any;
      fileInfo?: any;
      requestId?: string;
      logger?: any;
      csrfToken?: string;
      id?: string;
    }
  }
}

export {};
