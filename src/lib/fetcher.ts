// src/lib/fetcher.ts
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue }
export interface JsonArray extends Array<JsonValue> {}

// Generic fetcher for SWR and simple requests
export async function fetcher<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const details = payload as any;
    const message =
      (details && (details.message || details.error)) || res.statusText || `Request failed with ${res.status}`;
    throw new Error(message);
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    const success = (payload as { success?: unknown }).success;
    if (success === false) {
      const messageValue = (payload as { message?: unknown }).message;
      const message = typeof messageValue === "string" && messageValue.trim().length > 0
        ? messageValue
        : "Request failed";
      throw new Error(message);
    }
  }

  return payload as T;
}

export default fetcher;
