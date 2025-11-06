import { z } from "zod";

export const QueryAuditSchema = z.object({
  orgId: z.string().optional().nullable(),
  actorId: z.string().optional().nullable(),
  action: z.string().optional().nullable(),
  from: z.coerce.date().optional().nullable(),
  to: z.coerce.date().optional().nullable(),
  cursor: z.string().optional().nullable(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export type QueryAudit = z.infer<typeof QueryAuditSchema>;


