import { z } from 'zod';
import { SoftDeletableSchema, EventStatusSchema, ScoringMethodSchema } from './commonSchemas';

/**
 * Event entity response schema
 */
export const EventSchema = SoftDeletableSchema.extend({
  name: z.string(),
  description: z.string().nullable().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: EventStatusSchema,
  location: z.string().nullable().optional(),
  scoringMethod: ScoringMethodSchema.optional(),
  isPublished: z.boolean().optional(),
  createdBy: z.string().optional(),
});

/**
 * Event list item
 */
export const EventListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: EventStatusSchema,
  location: z.string().nullable().optional(),
  contestCount: z.number().optional(),
  createdAt: z.string().datetime(),
});

/**
 * Event list response
 */
export const EventListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(EventListItemSchema),
  total: z.number().optional(),
});

/**
 * Single event response
 */
export const EventResponseSchema = z.object({
  success: z.literal(true),
  data: EventSchema,
});

export type Event = z.infer<typeof EventSchema>;
export type EventListItem = z.infer<typeof EventListItemSchema>;
