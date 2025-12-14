export type TextChunk = {
  index: number;
  content: string;
};

function normalizeText(input: string): string {
  return (input || "")
    .replace(/\r\n/g, "\n")
    .replace(/[\t\u00A0]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function pushChunk(chunks: TextChunk[], index: number, content: string) {
  const v = normalizeText(content);
  if (!v) return;
  chunks.push({ index, content: v });
}

/**
 * Chia text thành các chunk nhỏ để tạo embedding.
 *
 * Quy tắc:
 * - Ưu tiên tách theo đoạn (split bởi "\n\n")
 * - Nếu đoạn quá dài, fallback tách theo từ để giới hạn độ dài
 */
export function chunkText(params: {
  text: string;
  maxChars: number;
}): TextChunk[] {
  const maxChars = Math.max(200, Math.floor(params.maxChars));
  const text = normalizeText(params.text);
  if (!text) return [];

  const paragraphs = text.split(/\n\n+/g).map((p) => p.trim()).filter(Boolean);
  const chunks: TextChunk[] = [];

  let buf = "";
  let idx = 0;

  const flush = () => {
    if (!buf.trim()) return;
    pushChunk(chunks, idx, buf);
    idx += 1;
    buf = "";
  };

  for (const p of paragraphs) {
    if (!p) continue;

    if ((buf + "\n\n" + p).trim().length <= maxChars) {
      buf = buf ? `${buf}\n\n${p}` : p;
      continue;
    }

    if (buf) flush();

    if (p.length <= maxChars) {
      buf = p;
      flush();
      continue;
    }

    const words = p.split(/\s+/g).filter(Boolean);
    let wbuf = "";
    for (const w of words) {
      const next = wbuf ? `${wbuf} ${w}` : w;
      if (next.length <= maxChars) {
        wbuf = next;
        continue;
      }
      pushChunk(chunks, idx, wbuf);
      idx += 1;
      wbuf = w;
    }
    if (wbuf) {
      pushChunk(chunks, idx, wbuf);
      idx += 1;
    }
  }

  if (buf) flush();
  return chunks;
}
