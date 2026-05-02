import { User, UserRole, Judge, Contestant, PrismaClient } from '@prisma/client';
import { Logger } from 'winston';

export type AuthenticatedRequestUser = Partial<Omit<User, 'id' | 'role'>> & {
  id: string;
  role: UserRole;
  tenantId: string;
  judge?: Judge | null;
  contestant?: Contestant | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedRequestUser;
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
      prisma?: PrismaClient;
      isSuperAdmin?: boolean;
      tenant?: {
        id: string;
        name: string;
        slug: string;
        domain: string | null;
        isActive: boolean;
        settings: Record<string, unknown>;
        planType: string;
      };
    }
  }
}

export {};
