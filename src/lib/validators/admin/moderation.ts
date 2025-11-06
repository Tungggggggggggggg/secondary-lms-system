import { z } from "zod";

export const ListQueueQuerySchema = z.object({
  orgId: z.string().optional().nullable(),
  type: z.enum(["announcement", "comment"]).optional().nullable(),
  cursor: z.string().optional().nullable(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const ModerationBodySchema = z.object({
  reason: z.string().max(500).optional().nullable(),
});


