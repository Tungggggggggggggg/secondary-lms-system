"use client";

interface AuditMetadataPreviewProps {
  metadata: unknown;
}

function summarizeMetadata(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "";
  try {
    const obj = meta as Record<string, unknown>;
    const entries = Object.entries(obj);
    if (!entries.length) return "";
    const preview = entries
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join("; ");
    return entries.length > 3 ? preview + "; …" : preview;
  } catch {
    return "";
  }
}

export default function AuditMetadataPreview({ metadata }: AuditMetadataPreviewProps) {
  const summary = summarizeMetadata(metadata);
  if (!summary) return null;

  return (
    <span className="text-[10px] text-slate-600 truncate block">
      {summary}
    </span>
  );
}
