import { z } from "zod";

export const SettingKeyParamSchema = z.object({
  key: z.string().min(1),
});

export const SettingBodySchema = z.object({
  value: z.any().nullable().optional(),
});


