import { describe, it, expect } from "vitest";
import { ListUsersQuerySchema, CreateUserBodySchema, UpdateUserBodySchema } from "@/lib/validators/admin/users";
import { ListOrgQuerySchema, CreateOrgBodySchema, UpdateOrgBodySchema } from "@/lib/validators/admin/org";
import { QueryAuditSchema } from "@/lib/validators/admin/audit";

describe("Validators", () => {
  it("ListUsersQuerySchema valid", () => {
    const parsed = ListUsersQuerySchema.parse({ orgId: "org1", limit: 10 });
    expect(parsed.orgId).toBe("org1");
  });

  it("CreateUserBodySchema requires email/password", () => {
    expect(() => CreateUserBodySchema.parse({ orgId: "o", email: "bad", fullname: "a", password: "123456", role: "ADMIN" })).toThrow();
    const ok = CreateUserBodySchema.parse({ orgId: "o", email: "a@b.com", fullname: "A", password: "123456", role: "ADMIN" });
    expect(ok.role).toBe("ADMIN");
  });

  it("UpdateUserBodySchema accepts subset", () => {
    const ok = UpdateUserBodySchema.parse({ fullname: "B" });
    expect(ok.fullname).toBe("B");
  });

  it("Org schemas", () => {
    expect(() => CreateOrgBodySchema.parse({} as any)).toThrow();
    const list = ListOrgQuerySchema.parse({ limit: 5 });
    expect(list.limit).toBe(5);
    const up = UpdateOrgBodySchema.parse({ name: "New" });
    expect(up.name).toBe("New");
  });

  it("Audit query schema", () => {
    const q = QueryAuditSchema.parse({ limit: 10 });
    expect(q.limit).toBe(10);
  });
});


