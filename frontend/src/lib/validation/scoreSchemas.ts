import { z } from 'zod';

export const submitScoreSchema = z.object({
  score: z
    .number({ message: 'Score must be a number' })
    .min(0, 'Score cannot be negative'),
  contestantId: z.string().min(1, 'Contestant is required'),
  categoryId: z.string().min(1, 'Category is required'),
  notes: z.string().optional(),
});

export type SubmitScoreInput = z.infer<typeof submitScoreSchema>;
