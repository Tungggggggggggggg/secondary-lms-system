import { GoogleGenerativeAI } from "@google/generative-ai";

type GenerateContentResultLike = { response: { text(): string } };

type GenerativeModelLike = {
  generateContent(request: unknown): Promise<GenerateContentResultLike>;
};

type GenAiClientLike = {
  getGenerativeModel(options: { model: string; systemInstruction?: string }): GenerativeModelLike;
};

function isModelNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    /models\//i.test(err.message) &&
    (/is not found for api version/i.test(err.message) ||
      /is not found/i.test(err.message) ||
      /not supported for generatecontent/i.test(err.message))
  );
}

/**
 * Gọi generateContent với danh sách model candidate; nếu gặp lỗi model-not-found thì tự fallback.
 *
 * @param client - GoogleGenerativeAI instance
 * @param params - cấu hình fallback
 * @returns result + modelUsed
 */
export async function generateContentWithModelFallback(
  client: GenAiClientLike,
  params: {
    modelCandidates: string[];
    systemInstruction?: string;
    request: unknown;
  }
): Promise<{ result: GenerateContentResultLike; modelUsed: string }> {
  const { modelCandidates, systemInstruction, request } = params;

  if (modelCandidates.length === 0) {
    throw new Error("Thiếu danh sách modelCandidates cho Gemini.");
  }

  let lastError: unknown;

  for (const modelName of modelCandidates) {
    try {
      const model = client.getGenerativeModel({ model: modelName, systemInstruction });
      const startedAt = Date.now();
      const result = await model.generateContent(request);

      if (process.env.NODE_ENV === "development") {
        const durationMs = Date.now() - startedAt;
        console.info(
          `[${new Date().toISOString()}] [AI_GEMINI] generateContent`,
          { model: modelName, durationMs }
        );
      }
      return { result, modelUsed: modelName };
    } catch (err: unknown) {
      lastError = err;
      if (isModelNotFoundError(err)) {
        continue;
      }
      throw err;
    }
  }

  if (lastError instanceof Error) {
    throw new Error("Dịch vụ AI không hỗ trợ các model đã cấu hình.");
  }
  throw new Error("Dịch vụ AI không hỗ trợ các model đã cấu hình.");
}

/**
 * Tạo danh sách model candidates theo thứ tự ưu tiên.
 *
 * @returns mảng model name
 */
export function getDefaultFastModelCandidates(): string[] {
  return ["gemini-2.5-flash-lite"];
}

/**
 * Tạo client Gemini.
 *
 * @param apiKey - GEMINI_API_KEY
 * @returns GoogleGenerativeAI client
 */
export function createGeminiClient(apiKey: string): GoogleGenerativeAI {
  return new GoogleGenerativeAI(apiKey);
}
