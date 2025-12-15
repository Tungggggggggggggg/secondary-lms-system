import { GoogleGenerativeAI } from "@google/generative-ai";
import type { TaskType } from "@google/generative-ai";
import { z } from "zod";

const EmbedContentResultSchema = z.object({
  embedding: z.object({
    values: z.array(z.number()),
  }),
});

export type GeminiEmbeddingTaskType = TaskType;

export type EmbedTextParams = {
  text: string;
  outputDimensionality?: 768 | 1536 | 3072;
  taskType?: GeminiEmbeddingTaskType;
};

export const DEFAULT_EMBEDDING_DIMENSIONALITY = 1536 as const;

/**
 * Tạo embedding vector từ text bằng Gemini Embedding model.
 *
 * Output:
 * - mảng số `number[]` (vector)
 *
 * Side effects:
 * - Gọi Gemini API qua `GEMINI_API_KEY`.
 */
export async function embedTextWithGemini(params: EmbedTextParams): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Thiếu cấu hình GEMINI_API_KEY trong biến môi trường.");
  }

  const text = (params.text || "").trim();
  if (!text) {
    throw new Error("Text embedding rỗng.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

  const request = {
    content: { role: "user", parts: [{ text }] },
    taskType: params.taskType,
    outputDimensionality: params.outputDimensionality ?? DEFAULT_EMBEDDING_DIMENSIONALITY,
  };

  const result = (await model.embedContent(
    request as unknown as Parameters<typeof model.embedContent>[0]
  )) as unknown;
  const validated = EmbedContentResultSchema.safeParse(result);
  if (!validated.success) {
    throw new Error("Phản hồi embedding không đúng định dạng.");
  }

  return validated.data.embedding.values;
}
