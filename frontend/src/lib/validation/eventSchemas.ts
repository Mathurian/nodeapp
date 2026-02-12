import { z } from 'zod';
import { optionalString, dateSchema } from './commonSchemas';

export const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(200, 'Name must be less than 200 characters'),
  description: optionalString,
  startDate: dateSchema,
  endDate: dateSchema,
  location: optionalString,
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export const updateEventSchema = createEventSchema.partial();

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
