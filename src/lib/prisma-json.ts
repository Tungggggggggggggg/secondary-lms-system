function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type JsonPrimitive = string | number | boolean;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue } | null;

export function toNestedPrismaJsonValue(
  value: unknown,
  depth = 0
): JsonValue | undefined {
  if (depth > 20) return undefined;
  if (value === null) return null;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (
    typeof value === "bigint" ||
    typeof value === "symbol" ||
    typeof value === "function" ||
    typeof value === "undefined"
  )
    return undefined;

  if (Array.isArray(value)) {
    const arr: JsonValue[] = [];
    for (const item of value) {
      const v = toNestedPrismaJsonValue(item, depth + 1);
      if (v === undefined) return undefined;
      arr.push(v);
    }
    return arr;
  }

  if (isRecord(value)) {
    const obj: Record<string, JsonValue> = {};
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
): JsonValue | null | undefined {
  if (value === undefined) return undefined;
  const nested = toNestedPrismaJsonValue(value);
  if (nested === undefined) return undefined;
  return nested;
}
