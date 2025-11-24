import { z } from "zod";

export const ListUsersQuerySchema = z.object({
  orgId: z.string().min(1, "orgId là bắt buộc"),
  cursor: z.string().optional().nullable(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional().nullable(),
});

export const CreateUserBodySchema = z.object({
  orgId: z.string().min(1),
  email: z.string().email(),
  fullname: z.string().min(1).max(200),
  password: z.string().min(6),
  role: z.enum(["STAFF", "TEACHER", "STUDENT", "PARENT", "SUPER_ADMIN"]).default("STUDENT"),
});

export const UpdateUserBodySchema = z.object({
  fullname: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  role: z.enum(["STAFF", "TEACHER", "STUDENT", "PARENT", "SUPER_ADMIN"]).optional(),
});

export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;
export type CreateUserBody = z.infer<typeof CreateUserBodySchema>;
export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>;


