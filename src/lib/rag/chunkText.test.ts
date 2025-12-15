import { describe, expect, it } from "vitest";

import { chunkText } from "@/lib/rag/chunkText";

describe("chunkText", () => {
  it("should return [] for empty text", () => {
    expect(chunkText({ text: "", maxChars: 500 })).toEqual([]);
  });

  it("should chunk long text and keep stable indexes", () => {
    const text = Array.from({ length: 1000 }).fill("word").join(" ");
    const chunks = chunkText({ text, maxChars: 300 });

    expect(chunks.length).toBeGreaterThan(1);
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i]?.index).toBe(i);
      expect(chunks[i]?.content.length).toBeLessThanOrEqual(300);
    }
  });

  it("should split very long token so that no chunk exceeds maxChars", () => {
    const longToken = "a".repeat(1000);
    const chunks = chunkText({ text: longToken, maxChars: 300 });

    expect(chunks.length).toBe(4);
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i]?.index).toBe(i);
      expect(chunks[i]?.content.length).toBeLessThanOrEqual(300);
    }
    expect(chunks.map((c) => c.content).join("")).toBe(longToken);
  });

  it("should respect paragraph boundaries while staying within maxChars", () => {
    const p1 = "P1 " + "a".repeat(120);
    const p2 = "P2 " + "b".repeat(120);
    const p3 = "P3 " + "c".repeat(120);
    const text = [p1, p2, p3].join("\n\n");
    const chunks = chunkText({ text, maxChars: 200 });

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    for (const ch of chunks) {
      expect(ch.content.length).toBeLessThanOrEqual(200);
    }
  });
});
