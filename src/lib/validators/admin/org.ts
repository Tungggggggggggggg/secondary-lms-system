import { z } from "zod";

export const ListOrgQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional().nullable(),
});

export const CreateOrgBodySchema = z.object({
  name: z.string().min(1).max(200),
});

export const UpdateOrgBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type ListOrgQuery = z.infer<typeof ListOrgQuerySchema>;
export type CreateOrgBody = z.infer<typeof CreateOrgBodySchema>;
export type UpdateOrgBody = z.infer<typeof UpdateOrgBodySchema>;


