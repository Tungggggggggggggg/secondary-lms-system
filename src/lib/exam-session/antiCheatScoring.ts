export type AntiCheatRiskLevel = "low" | "medium" | "high";

export type AntiCheatRuleBreakdownItem = {
  ruleId: string;
  title: string;
  count: number;
  points: number;
  maxPoints: number;
  details: string;
};

export type AntiCheatScoreResult = {
  suspicionScore: number;
  riskLevel: AntiCheatRiskLevel;
  breakdown: AntiCheatRuleBreakdownItem[];
  countsByType: Record<string, number>;
};

export type ExamEventForScoring = {
  eventType: string;
  createdAt: Date;
  metadata: unknown;
};

function normalizeEventType(eventType: string): string {
  const raw = (eventType || "").toString().trim();
  if (!raw) return "";

  switch (raw) {
    case "TAB_SWITCH_DETECTED":
      return "TAB_SWITCH";
    case "COPY_PASTE_ATTEMPT":
      return "CLIPBOARD";
    default:
      return raw;
  }
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  const v = Math.floor(value);
  return Math.min(max, Math.max(min, v));
}

function riskLevelFromScore(score: number): AntiCheatRiskLevel {
  if (score >= 50) return "high";
  if (score >= 20) return "medium";
  return "low";
}

function addRule(params: {
  ruleId: string;
  title: string;
  count: number;
  pointsPerHit: number;
  maxPoints: number;
  details: string;
}): AntiCheatRuleBreakdownItem {
  const rawPoints = params.count * params.pointsPerHit;
  const points = clampInt(Math.min(params.maxPoints, rawPoints), 0, 100);
  return {
    ruleId: params.ruleId,
    title: params.title,
    count: clampInt(params.count, 0, 9999),
    points,
    maxPoints: clampInt(params.maxPoints, 0, 100),
    details: params.details,
  };
}

/**
 * Tính điểm nghi ngờ (0..100) theo rule-based từ danh sách exam events.
 *
 * Input KHÔNG tin cậy hoàn toàn, nên chỉ dùng eventType + count; không dựa vào metadata tuỳ ý.
 */
export function computeQuizAntiCheatScore(events: ExamEventForScoring[]): AntiCheatScoreResult {
  const countsByType: Record<string, number> = {};

  for (const ev of events) {
    const type = normalizeEventType(ev.eventType);
    if (!type) continue;
    countsByType[type] = (countsByType[type] ?? 0) + 1;
  }

  const countOf = (type: string) => countsByType[type] ?? 0;

  const breakdown: AntiCheatRuleBreakdownItem[] = [];

  breakdown.push(
    addRule({
      ruleId: "fullscreen_exit",
      title: "Thoát fullscreen",
      count: countOf("FULLSCREEN_EXIT"),
      pointsPerHit: 20,
      maxPoints: 40,
      details: "Thoát fullscreen có thể cho thấy học sinh rời màn hình làm bài.",
    })
  );

  breakdown.push(
    addRule({
      ruleId: "tab_switch",
      title: "Chuyển tab",
      count: countOf("TAB_SWITCH"),
      pointsPerHit: 12,
      maxPoints: 60,
      details: "Chuyển tab trong lúc làm bài là tín hiệu rủi ro cao (tra cứu/trao đổi).",
    })
  );

  breakdown.push(
    addRule({
      ruleId: "window_blur",
      title: "Rời cửa sổ (blur)",
      count: countOf("WINDOW_BLUR"),
      pointsPerHit: 5,
      maxPoints: 20,
      details: "Cửa sổ mất focus (alt-tab, chuyển ứng dụng) trong lúc làm bài.",
    })
  );

  breakdown.push(
    addRule({
      ruleId: "clipboard",
      title: "Copy/Cut/Paste/Context menu",
      count: countOf("CLIPBOARD"),
      pointsPerHit: 8,
      maxPoints: 24,
      details: "Hệ thống phát hiện thao tác clipboard bị chặn (copy/paste/cut/contextmenu).",
    })
  );

  breakdown.push(
    addRule({
      ruleId: "shortcut",
      title: "Phím tắt nghi ngờ",
      count: countOf("SHORTCUT"),
      pointsPerHit: 6,
      maxPoints: 18,
      details: "Phát hiện phím tắt (Ctrl/Cmd+C/V/X/A...) bị chặn.",
    })
  );

  const score = clampInt(
    Math.min(
      100,
      breakdown.reduce((sum, item) => sum + (item.points || 0), 0)
    ),
    0,
    100
  );

  return {
    suspicionScore: score,
    riskLevel: riskLevelFromScore(score),
    breakdown: breakdown.filter((b) => b.count > 0 || b.points > 0),
    countsByType,
  };
}
