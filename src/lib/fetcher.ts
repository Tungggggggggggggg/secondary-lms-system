// src/lib/fetcher.ts
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue }
export interface JsonArray extends Array<JsonValue> {}

// Generic fetcher for SWR and simple requests
export async function fetcher<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    // Try to parse error body for better message
    let details: any = undefined;
    try {
      details = await res.json();
    } catch (_) {}
    const message = (details && (details.message || details.error)) || `Request failed with ${res.status}`;
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export default fetcher;
