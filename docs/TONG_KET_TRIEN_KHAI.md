# HANDOVER / TỔNG KẾT TRIỂN KHAI (Secondary LMS System)

**Mục đích:** tài liệu bàn giao nhanh để người tiếp theo setup môi trường, chạy demo, chạy test và biết rõ việc cần làm tiếp.

**Cập nhật lần cuối:** 2025-12-15

---

## 0) TL;DR (đọc 1 phút)

-   **Trạng thái:** hệ thống chạy được, demo được. API đã harden theo Option B. QA (lint/test/build/typecheck) đã pass.
-   **Quy ước API sau hardening:**
    -   `401` nếu chưa đăng nhập; `403` nếu sai role/không có quyền.
    -   Validate `params/query/body` bằng Zod.
    -   Lỗi trả về bằng `errorResponse(...)`, không leak `error.message/stack`.
    -   Prisma enum/JSON phải map đúng kiểu (không gán string/null tuỳ ý).

---

## 1) Quick start (local)

### 1.1 Cài đặt

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

### 1.2 ENV tối thiểu

-   Bắt buộc:
    -   `DATABASE_URL`
    -   `NEXTAUTH_SECRET`
-   Tuỳ tính năng:
    -   AI: `GEMINI_API_KEY`
    -   Cron: `CRON_SECRET`
    -   Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`

---

## 2) QA (đã chạy và PASS)

Chạy trong root project:

```bash
npm run lint
npm test
npm run build
npx tsc --noEmit
```

---

## 3) Đã hoàn thành (tóm tắt)

-   **Core auth/role:** NextAuth + middleware chặn cross-role, onboarding chọn role.
-   **Chuẩn hoá lỗi:** `errorResponse()`.
-   **API Hardening (Option B):** chuẩn hoá auth/role check + Zod validation + không leak lỗi + bỏ `any/as any` trong API.
-   **Teacher Assignments:** CRUD + create essay/quiz + update typing enum/JSON.
-   **Student submissions + parent/student linking:** đã chuẩn hoá auth/role + validate.
-   **Announcements + Classrooms + Chat:** dọn log/any và chuẩn hoá response lỗi.
-   **RAG Tutor + AI (Gemini):** các endpoint chính đã có (chi tiết xem docs tham chiếu).

---

## 4) Tài khoản demo

-   Seed file: `prisma/seed.js`
-   Password mặc định: `123456`
-   Admin demo:
    -   Email: `admin.tranthilan@gmail.com`
    -   Password: `123456`

---

## 5) Việc cần làm tiếp theo (để người sau bám theo)

### P0 — nên làm ngay

-   [ ] Viết checklist QA manual ngắn cho 4 vai trò (Admin/Teacher/Student/Parent).
-   [ ] Thiết lập cron trên deploy:
    -   `POST /api/cron/parent-weekly-summary`
    -   `POST /api/cron/index-lesson-embeddings`
-   [ ] Thêm smoke tests cho API hardening:
    -   401/403 semantics
    -   không leak `error.message`
    -   regression cho Prisma enum/JSON ở assignments

### P1 — nâng chất lượng

-   [ ] RAG: incremental indexing + batching/retry để giảm timeout.
-   [ ] Tutor UI: empty state + sources modal/preview.
-   [ ] Cân nhắc gom helper “unknown → Prisma JSON” thành file dùng chung để tránh duplicate.

### P2 — mở rộng

-   [ ] Anti-cheat summary bằng AI.

---

## 6) Tham chiếu (đọc sâu khi cần)

-   `docs/ADMIN.md`
-   `docs/BAO_CAO_HE_THONG.md`
-   `docs/RAG_QA.md`
-   `docs/UPDATE.md`
