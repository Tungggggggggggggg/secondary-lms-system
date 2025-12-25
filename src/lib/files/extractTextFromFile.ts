export type SupportedQuizSourceMime =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "text/plain";

function normalizeText(input: string): string {
  return input
    .split("\u0000").join("")
    .replace(/\r\n/g, "\n")
    .trim();
}

function clip(input: string, maxChars: number): string {
  const s = input.trim();
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars);
}

function getExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx === -1) return "";
  return name.slice(idx + 1).toLowerCase();
}

function detectMime(file: File): SupportedQuizSourceMime | null {
  const type = (file.type || "").toLowerCase();
  if (
    type === "application/pdf" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    type === "text/plain"
  ) {
    return type;
  }

  const ext = getExtension(file.name || "");
  if (ext === "pdf") return "application/pdf";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "txt") return "text/plain";
  return null;
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const mod: unknown = await import("pdf-parse");
  const pdfParse = mod as { default?: unknown };
  const fn = pdfParse.default;
  if (typeof fn !== "function") {
    throw new Error("PDF parser không khả dụng.");
  }
  const result = (await (fn as (b: Buffer) => Promise<unknown>)(buffer)) as { text?: unknown };
  const text = typeof result?.text === "string" ? result.text : "";
  return text;
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mod: unknown = await import("mammoth");
  const mammoth = mod as { extractRawText?: unknown };
  if (typeof mammoth.extractRawText !== "function") {
    throw new Error("DOCX parser không khả dụng.");
  }

  const res = (await (mammoth.extractRawText as (p: { buffer: Buffer }) => Promise<unknown>)(
    { buffer }
  )) as { value?: unknown };

  return typeof res?.value === "string" ? res.value : "";
}

/**
 * Trích xuất text từ File upload để dùng làm nguồn sinh quiz.
 *
 * @param file - File nhận từ Next.js `req.formData()`
 * @returns plain text đã normalize + clip
 * @throws Error nếu file type không hỗ trợ hoặc không extract được
 */
export async function extractTextFromFile(file: File): Promise<{ text: string; mime: SupportedQuizSourceMime }> {
  const mime = detectMime(file);
  if (!mime) {
    throw new Error("Định dạng file không được hỗ trợ. Chỉ hỗ trợ PDF/DOCX/TXT.");
  }

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("File quá lớn. Vui lòng chọn file nhỏ hơn hoặc rút gọn nội dung.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let raw = "";
  if (mime === "text/plain") {
    raw = new TextDecoder("utf-8").decode(arrayBuffer);
  } else if (mime === "application/pdf") {
    raw = await extractTextFromPdf(buffer);
  } else {
    raw = await extractTextFromDocx(buffer);
  }

  const normalized = normalizeText(raw);
  const clipped = clip(normalized, 20_000);

  if (!clipped) {
    throw new Error("Không trích xuất được nội dung văn bản từ file.");
  }

  return { text: clipped, mime };
}
