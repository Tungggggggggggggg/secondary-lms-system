import { describe, it, expect } from "vitest";
import { requireSuperAdmin } from "@/lib/org-scope";

describe("Guards", () => {
  it("requireSuperAdmin passes for SUPER_ADMIN", () => {
    expect(() => requireSuperAdmin({ id: "u1", role: "SUPER_ADMIN" })).not.toThrow();
  });

  it("requireSuperAdmin throws otherwise", () => {
    expect(() => requireSuperAdmin({ id: "u1", role: "ADMIN" })).toThrow();
  });
});


