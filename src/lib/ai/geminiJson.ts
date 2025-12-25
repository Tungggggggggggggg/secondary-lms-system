import type { ZodIssue } from "zod";

/**
 * Chuẩn hoá text có thể là JSON từ LLM để tăng khả năng parse.
 *
 * @param input - raw text từ model
 * @returns text đã normalize (trim, thay quote unicode, chuẩn hoá newline)
 */
export function normalizeJsonCandidate(input: string): string {
  return input
    .trim()
    .replace(/\uFEFF/g, "")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2028\u2029]/g, "\n")
    .replace(/\r\n/g, "\n");
}

function sanitizeJsonTextForParse(input: string): string {
  const s = input;
  let out = "";
  let inString = false;
  let escaped = false;

  const isValidEscape = (ch: string) =>
    ch === '"' ||
    ch === "\\" ||
    ch === "/" ||
    ch === "b" ||
    ch === "f" ||
    ch === "n" ||
    ch === "r" ||
    ch === "t" ||
    ch === "u";

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }

      if (ch === "\\") {
        const next = i + 1 < s.length ? s[i + 1] : "";
        if (next && isValidEscape(next)) {
          out += ch;
          escaped = true;
          continue;
        }
        out += "\\\\";
        continue;
      }

      if (ch === "\n") {
        out += "\\n";
        continue;
      }

      if (ch === "\r") {
        out += "\\n";
        continue;
      }

      if (ch === "\t") {
        out += "\\t";
        continue;
      }

      if (ch === "\b") {
        out += "\\b";
        continue;
      }

      if (ch === "\f") {
        out += "\\f";
        continue;
      }

      if (ch === '"') {
        inString = false;
        out += ch;
        continue;
      }

      const code = ch.charCodeAt(0);
      if (code >= 0 && code < 0x20) {
        out += `\\u${code.toString(16).padStart(4, "0")}`;
        continue;
      }

      out += ch;
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }

    out += ch;
  }

  return out;
}

function normalizeLooseJsonOutsideStrings(input: string): string {
  const s = input;
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }

    if (ch === "\\") {
      const next = i + 1 < s.length ? s[i + 1] : "";
      if (next === "n" || next === "r") {
        out += "\n";
        i++;
        continue;
      }
      if (next === "t") {
        out += "\t";
        i++;
        continue;
      }
      if (next === "b" || next === "f") {
        out += " ";
        i++;
        continue;
      }
      if (next === "\n") {
        continue;
      }
      continue;
    }

    out += ch;
  }

  return out;
}

function completeJsonBrackets(input: string): string {
  const closeToOpen: Record<string, string> = { "}": "{", "]": "[" };
  const openToClose: Record<string, string> = { "{": "}", "[": "]" };

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{" || ch === "[") {
      stack.push(ch);
      continue;
    }

    if (ch === "}" || ch === "]") {
      const expectedOpen = closeToOpen[ch];
      const last = stack.pop();
      if (last !== expectedOpen) return input;
    }
  }

  if (stack.length === 0 && !inString) return input;

  let base = input;
  if (inString) {
    if (escaped && base.endsWith("\\")) {
      base = base.slice(0, -1);
    }
    base += '"';
  }

  let out = base.replace(/,\s*$/g, "");
  for (let i = stack.length - 1; i >= 0; i--) {
    const open = stack[i];
    out = out.replace(/,\s*$/g, "");
    out += openToClose[open] ?? "";
  }
  return out;
}

function extractFirstJsonBlock(text: string): string | undefined {
  const startIndex = text.search(/[[{]/);
  if (startIndex === -1) return undefined;

  const closeToOpen: Record<string, string> = { "}": "{", "]": "[" };
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{" || ch === "[") {
      stack.push(ch);
      continue;
    }

    if (ch === "}" || ch === "]") {
      const expectedOpen = closeToOpen[ch];
      const last = stack.pop();
      if (last !== expectedOpen) return undefined;
      if (stack.length === 0) return text.slice(startIndex, i + 1);
    }
  }

  return undefined;
}

function extractJsonPrefix(text: string): string | undefined {
  const startIndex = text.search(/[[{]/);
  if (startIndex === -1) return undefined;
  return text.slice(startIndex);
}

function tryParseJsonCandidate(candidate: string): unknown | undefined {
  const normalized = sanitizeJsonTextForParse(
    normalizeLooseJsonOutsideStrings(normalizeJsonCandidate(candidate))
  );

  try {
    return JSON.parse(normalized);
  } catch {
    const sanitized = normalized.replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(sanitized);
    } catch {
      const completed = completeJsonBrackets(sanitized).replace(/,\s*([}\]])/g, "$1");
      try {
        return JSON.parse(completed);
      } catch {
        return undefined;
      }
    }
  }
}

/**
 * Parse JSON từ text output của Gemini (có thể có ```json fence, ký tự lạ, hoặc bị cắt cụt).
 *
 * @param text - raw output từ model
 * @returns object/array parse được
 * @throws Error nếu không thể parse
 */
export function parseJsonFromGeminiText(text: string): unknown {
  const normalizedText = normalizeJsonCandidate(text);

  const direct = tryParseJsonCandidate(normalizedText);
  if (typeof direct !== "undefined") return direct;

  const fencedMatches = normalizedText.matchAll(/```(?:\s*json)?\s*([\s\S]*?)\s*```/gi);
  for (const match of fencedMatches) {
    const inner = match[1]?.trim();
    if (!inner) continue;
    const parsedInner = tryParseJsonCandidate(inner);
    if (typeof parsedInner !== "undefined") return parsedInner;
    const extractedInner = extractFirstJsonBlock(inner);
    if (extractedInner) {
      const parsedExtracted = tryParseJsonCandidate(extractedInner);
      if (typeof parsedExtracted !== "undefined") return parsedExtracted;
    }
  }

  const extracted = extractFirstJsonBlock(normalizedText);
  if (extracted) {
    const parsedCandidate = tryParseJsonCandidate(extracted);
    if (typeof parsedCandidate !== "undefined") return parsedCandidate;
  }

  const prefix = extractJsonPrefix(normalizedText);
  if (prefix) {
    const parsedPrefix = tryParseJsonCandidate(prefix);
    if (typeof parsedPrefix !== "undefined") return parsedPrefix;
  }

  throw new Error("Không parse được JSON từ phản hồi AI.");
}

/**
 * Format danh sách lỗi Zod issues thành string gọn để đưa vào Error message.
 *
 * @param issues - danh sách ZodIssue
 * @returns string format "path: message; ..."
 */
export function formatZodIssues(issues: ZodIssue[]): string {
  return issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}
