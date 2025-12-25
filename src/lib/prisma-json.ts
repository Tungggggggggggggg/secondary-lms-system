import { Prisma } from "@prisma/client";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toNestedPrismaJsonValue(
  value: unknown,
  depth = 0
): Prisma.InputJsonValue | null | undefined {
  if (depth > 20) return undefined;
  if (value === null) return null;

  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return value;
  if (t === "bigint" || t === "symbol" || t === "function" || t === "undefined") return undefined;

  if (Array.isArray(value)) {
    const arr: Array<Prisma.InputJsonValue | null> = [];
    for (const item of value) {
      const v = toNestedPrismaJsonValue(item, depth + 1);
      if (v === undefined) return undefined;
      arr.push(v);
    }
    return arr;
  }

  if (isRecord(value)) {
    const obj: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [k, vUnknown] of Object.entries(value)) {
      const v = toNestedPrismaJsonValue(vUnknown, depth + 1);
      if (v === undefined) return undefined;
      obj[k] = v;
    }
    return obj;
  }

  return undefined;
}

export function coercePrismaJson(
  value: unknown
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  const nested = toNestedPrismaJsonValue(value);
  if (nested === undefined) return undefined;
  if (nested === null) return Prisma.JsonNull;
  return nested;
}
