import { z } from "zod";

export const ReportsQuerySchema = z.object({
  orgId: z.string().optional().nullable(),
});


