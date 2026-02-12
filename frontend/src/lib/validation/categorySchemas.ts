import { z } from 'zod';
import { optionalString } from './commonSchemas';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(200, 'Name must be less than 200 characters'),
  description: optionalString,
  contestId: z.string().min(1, 'Contest is required'),
  scoreCap: z.number().min(1, 'Score cap must be at least 1').max(1000, 'Score cap must be 1000 or less').default(100),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
