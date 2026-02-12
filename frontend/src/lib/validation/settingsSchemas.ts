import { z } from 'zod';
import { optionalString } from './commonSchemas';

export const tenantSettingsSchema = z.object({
  appName: z.string().min(1, 'App name is required').max(100, 'App name must be less than 100 characters'),
  appSubtitle: optionalString,
  contactEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  maxJudgesPerCategory: z.number().min(1).max(100).optional(),
  allowPublicResults: z.boolean().default(false),
});

export type TenantSettingsInput = z.infer<typeof tenantSettingsSchema>;
