import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => {
  return {
    NextRequest: class NextRequest {},
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status }),
    },
  };
});

vi.mock("next-auth", () => {
  return {
    getServerSession: vi.fn(),
  };
});

vi.mock("@/lib/auth-options", () => {
  return {
    authOptions: {},
  };
});

vi.mock("@/lib/prisma", () => {
  return {
    default: {},
  };
});

vi.mock("@/lib/repositories/settings-repo", () => {
  return {
    settingsRepo: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      listKeys: vi.fn(),
    },
  };
});

import { errorResponse } from "@/lib/api-utils";

describe("errorResponse", () => {
  it("should return standard error payload with details=null by default", () => {
    const res = errorResponse(400, "Bad request");

    expect(res).toEqual({
      status: 400,
      body: {
        success: false,
        error: true,
        message: "Bad request",
        details: null,
      },
    });
  });

  it("should keep provided details and disallow overriding success/error/message", () => {
    const res = errorResponse(422, "Invalid", {
      details: [{ field: "name", message: "required" }],
      success: true,
      error: false,
      message: "override",
      extra: "x",
    });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      success: false,
      error: true,
      message: "Invalid",
      details: [{ field: "name", message: "required" }],
      extra: "x",
    });
  });
});
