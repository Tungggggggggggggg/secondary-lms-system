import { describe, expect, it } from "vitest";

import { computeQuizAntiCheatScore } from "@/lib/exam-session/antiCheatScoring";

describe("computeQuizAntiCheatScore", () => {
  it("should normalize TAB_SWITCH_DETECTED to TAB_SWITCH", () => {
    const score = computeQuizAntiCheatScore([
      { eventType: "TAB_SWITCH_DETECTED", createdAt: new Date(), metadata: null },
    ]);

    expect(score.countsByType["TAB_SWITCH"]).toBe(1);
    expect(score.breakdown.some((b) => b.ruleId === "tab_switch" && b.count === 1)).toBe(true);
    expect(score.suspicionScore).toBe(12);
    expect(score.riskLevel).toBe("low");
  });

  it("should normalize COPY_PASTE_ATTEMPT to CLIPBOARD", () => {
    const score = computeQuizAntiCheatScore([
      { eventType: "COPY_PASTE_ATTEMPT", createdAt: new Date(), metadata: null },
    ]);

    expect(score.countsByType["CLIPBOARD"]).toBe(1);
    expect(score.breakdown.some((b) => b.ruleId === "clipboard" && b.count === 1)).toBe(true);
    expect(score.suspicionScore).toBe(8);
    expect(score.riskLevel).toBe("low");
  });

  it("should cap points per rule and compute riskLevel correctly", () => {
    const score = computeQuizAntiCheatScore([
      { eventType: "FULLSCREEN_EXIT", createdAt: new Date(), metadata: null },
      { eventType: "FULLSCREEN_EXIT", createdAt: new Date(), metadata: null },
      { eventType: "FULLSCREEN_EXIT", createdAt: new Date(), metadata: null },
      { eventType: "TAB_SWITCH", createdAt: new Date(), metadata: null },
    ]);

    // FULLSCREEN_EXIT: pointsPerHit=20, maxPoints=40 => cap at 40
    expect(score.breakdown.some((b) => b.ruleId === "fullscreen_exit" && b.points === 40)).toBe(true);
    // Total score: 40 + 12 = 52
    expect(score.suspicionScore).toBe(52);
    expect(score.riskLevel).toBe("high");
  });
});
