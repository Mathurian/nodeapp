import { z } from 'zod';
import { optionalString } from './commonSchemas';

export const createContestSchema = z.object({
  name: z.string().min(1, 'Contest name is required').max(200, 'Name must be less than 200 characters'),
  description: optionalString,
  eventId: z.string().min(1, 'Event is required'),
  commentaryMode: z.enum(['PER_CRITERION', 'PER_CATEGORY', 'HYBRID']).default('PER_CRITERION'),
  commentaryScope: z.enum(['CATEGORY', 'CONTEST', 'EVENT']).default('CATEGORY'),
  scoringType: z.enum(['STRAIGHT', 'OLYMPIC']).default('STRAIGHT'),
});

export const updateContestSchema = createContestSchema.partial();

export type CreateContestInput = z.infer<typeof createContestSchema>;
export type UpdateContestInput = z.infer<typeof updateContestSchema>;
