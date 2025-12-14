# HANDOVER / TỔNG KẾT TRIỂN KHAI (Secondary LMS System)

**Mục đích:** tài liệu bàn giao nhanh để người tiếp theo setup môi trường, chạy demo, chạy test và biết rõ việc cần làm tiếp.

**Cập nhật lần cuối:** 2025-12-14

---

## 0. TL;DR (đọc 2 phút)

Mục tiêu của file này: giúp người tiếp theo **setup + chạy demo + biết rõ cái gì đã xong và cái gì còn thiếu**.

- Trạng thái ký hiệu:
  - `[x]` = đã triển khai & dùng được
  - `[~]` = đã có MVP nhưng còn việc vận hành/QA
  - `[ ]` = chưa triển khai

### 0.1. Checklist trạng thái theo module

#### Nền tảng hệ thống
- [x] Onboarding bắt buộc chọn role (`/auth/select-role`, `roleSelectedAt`).
- [x] NextAuth + middleware chặn cross-role, bảo vệ `/dashboard/admin/*`.
- [x] Audit logs (Prisma + repo) & helper `errorResponse()` chuẩn hoá lỗi.
- [x] System settings (maintenance mode + global announcement).
- [x] Notifications (MVP) (API + UI bell).

#### Admin portal (global)
- [x] Admin Users: list/filter/search/paginate.
- [x] Admin Users: Ban/Unban.
- [x] Admin Users: Create Teacher + Bulk Create Teacher.
- [x] Admin Users: Reset password.
- [x] Admin Classrooms: list + archive/unarchive.
- [x] Admin Classrooms: detail + edit + change teacher.
- [x] Admin Classrooms: bulk add students (CSV) + export CSV.
- [x] Admin Classrooms: remove students (single + bulk).
- [ ] Admin Classrooms: Force delete classroom.

#### AI (Gemini)
- [x] Quiz generator từ text: `POST /api/ai/quiz`.
- [x] Quiz generator từ file: `POST /api/ai/quiz/file`.
- [x] Essay grading suggestion: `POST /api/ai/grade`.
- [x] Parent smart summary (on-demand): `POST /api/ai/parent/summary`.
- [] Parent weekly summary (cron endpoint có sẵn): `POST /api/cron/parent-weekly-summary` (còn thiếu cấu hình schedule trên deploy).

#### P2.6 — RAG Tutor (Student)
- [] DB pgvector + bảng `lesson_embedding_chunks` (vector dim = 1536).
- [] Chunking lesson content.
- [] Cron indexer embeddings: `POST /api/cron/index-lesson-embeddings`.
- [] Tutor Chat API (retrieve topK + generate + sources): `POST /api/ai/tutor/chat`.
- [] Student UI lesson detail + tab Tutor: `/dashboard/student/classes/[classId]/lessons/[lessonId]`.
- [] Student UI danh sách bài học + navigation: `/dashboard/student/classes/[classId]/lessons`.
- [] Vận hành deploy: cấu hình cron schedule + chiến lược incremental/batching để tránh timeout.
- [] QA: checklist test thủ công + test tự động tối thiểu cho RAG.

### 0.2. Cách demo nhanh (local)

1) Cài đặt & chạy: xem mục **1. Quick start**.
2) Đăng nhập Admin (seed): xem mục **3.1**.
3) Test RAG tutor:
  - Set env (PowerShell):
    - `$env:CRON_SECRET="..."`
    - `$env:GEMINI_API_KEY="..."`
  - Chạy index (dry run trước):
    - `POST http://localhost:3000/api/cron/index-lesson-embeddings?dryRun=1&limit=5`
    - Header: `x-cron-secret: <CRON_SECRET>`
  - Chạy thật:
    - `POST http://localhost:3000/api/cron/index-lesson-embeddings?limit=5`
  - Mở lesson và chat:
    - `/dashboard/student/classes/[classId]/lessons/[lessonId]` → tab **Tutor**.

 4) Test cron weekly summary (Parent):
   - Dry run:
     - `POST http://localhost:3000/api/cron/parent-weekly-summary?dryRun=1&limit=50`
     - Header: `x-cron-secret: <CRON_SECRET>`

### 0.3. Lộ trình làm tiếp (ưu tiên)

- **P0 (ổn định demo/production):**
  - [x] Seed đã có sẵn 1 user `ADMIN` để demo Admin portal (xem **3.1**).
  - [ ] Viết checklist test thủ công cho AI + RAG (API + UI).
  - [ ] Thiết lập schedule cron trên deploy (Vercel Cron) cho weekly summary + index embeddings.
- **P1 (nâng chất lượng):**
  - [ ] RAG: incremental indexing theo `updatedAt`, batching/retry để tránh timeout.
  - [ ] Tutor UI: hiển thị sources chi tiết hơn (preview/modal) + empty state khi chưa có embeddings.
- **P2 (mở rộng):**
  - [ ] Anti-cheat summary bằng AI.

---

## 1. Quick start (local)

### 1.1. Cài đặt & chạy

- `npm install`
- `npx prisma migrate dev`
- `npx prisma db seed`
- `npm run dev`

### 1.2. Lệnh kiểm tra

- `npm test` (Vitest)
- `npm run lint`
- `npm run build`

---

## 2. ENV cần thiết

### 2.1. Bắt buộc

- `DATABASE_URL`
- `NEXTAUTH_SECRET`

### 2.2. Tuỳ chọn theo chức năng

- **Google OAuth:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Email (reset password):** `EMAIL_USER`, `EMAIL_PASS`
- **AI (Gemini):** `GEMINI_API_KEY`
- **Cron:** `CRON_SECRET`
- **Supabase (upload file):**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE`

---

## 3. Seed / dữ liệu demo

- Seed file: `prisma/seed.js`
- Password mặc định: `123456`

### 3.1. Lưu ý quan trọng: tài khoản ADMIN

 - Schema có `UserRole.ADMIN` (xem `prisma/schema.prisma`).
 - `middleware.ts` chặn `/dashboard/admin/*` và `/api/admin/*` nếu không phải `ADMIN`.
 - **Seed hiện tại có tạo user role `ADMIN`:**
   - Email: `admin.tranthilan@gmail.com`
   - Password: `123456`

 Nếu seed bị thay đổi hoặc DB đã có dữ liệu cũ, bạn có thể:

 - Chạy lại `npx prisma db seed` để upsert role.
 - Hoặc set `role = ADMIN` bằng Prisma Studio / SQL update.

---

## 4. Chức năng chính + cách test nhanh (local)

Mục tiêu của mục này: sau khi đọc xong bạn biết **mở trang nào / gọi endpoint nào** để kiểm tra nhanh.

### 4.1. Admin (global)

- **Điều kiện:** user có role `ADMIN` (xem **3.1**).
- **Mở UI:**
  - Dashboard: `/dashboard/admin/dashboard`
  - Users: `/dashboard/admin/users`
  - Classrooms: `/dashboard/admin/classrooms`
  - Audit logs: `/dashboard/admin/audit-logs`
  - Settings: `/dashboard/admin/settings`
- **Kiểm tra nhanh:**
  - Ban/Unban user.
  - Archive/Unarchive classroom.
  - Bật/tắt maintenance mode + global announcement.

### 4.2. Teacher (AI)

- **AI Quiz (từ text):** `POST /api/ai/quiz` (teacher-only).
- **AI Quiz (từ file upload):** `POST /api/ai/quiz/file` (teacher-only, `multipart/form-data`, runtime `nodejs`).
- **AI gợi ý chấm tự luận:** `POST /api/ai/grade` (teacher-only, chỉ hỗ trợ `ESSAY` ở MVP).
- **Lưu ý vận hành:** các API AI đều có rate limit; khi Gemini lỗi model / parse JSON, API nên trả `502`.

### 4.3. Parent (AI)

- **Smart summary (on-demand):** `POST /api/ai/parent/summary` (parent-only).
  - Có cache theo bucket (để gọi lại nhanh).
- **Weekly summary (Cron):** `POST /api/cron/parent-weekly-summary` (bảo vệ bằng `CRON_SECRET`).

### 4.4. Student (RAG Tutor theo bài học)

- **Bước 1: đảm bảo đã có embeddings**
  - Gọi cron index: `POST /api/cron/index-lesson-embeddings` (bảo vệ bằng `CRON_SECRET`).
- **Bước 2: test UI chat**
  - Lesson list: `/dashboard/student/classes/[classId]/lessons`
  - Lesson detail + tab Tutor: `/dashboard/student/classes/[classId]/lessons/[lessonId]`
- **API chat:** `POST /api/ai/tutor/chat` (student-only).

---

## 5. Tests hiện có

- Chạy test: `npm test` (Vitest).
- Hiện tại repo **không có** `vitest.config.ts` và **không có** `tests/smoke/*`.
- Test hiện có (tối thiểu):
  - `src/lib/exam-session/__tests__/session-manager.test.ts`
  - `src/lib/exam-session/__tests__/antiCheatScoring.test.ts`
- **Việc nên bổ sung lại:** smoke tests cho các luồng AI (quiz/grade/parent summary) vì các test này đã bị xoá.

---

## 6. Known issues / lưu ý vận hành

- **RAG/pgvector dimension:**
  - Đã chốt embedding dimension = **1536** (đồng bộ DB + embedding + retrieval) để tránh lỗi giới hạn index.

---

## 7. Việc cần làm tiếp theo (ưu tiên)

### 7.1. P0 (nên làm ngay)

- Kiểm tra seed đã có user `ADMIN` để demo Admin portal (xem **3.1**).
- Viết checklist test thủ công (ngắn gọn) cho 4 vai trò: Admin / Teacher-AI / Parent-AI / Student-RAG.
- Thiết lập schedule cron trên deploy (Vercel Cron):
  - `POST /api/cron/parent-weekly-summary`
  - `POST /api/cron/index-lesson-embeddings`
- Chuẩn hoá lỗi `502` đồng nhất cho các API AI khi Gemini lỗi model / JSON invalid (đảm bảo `/api/ai/quiz` và `/api/ai/parent/summary` hành xử giống `/api/ai/grade`).
- Bổ sung lại test tối thiểu cho AI (mock Gemini) cho các case:
  - JSON bị lỗi/truncated
  - model-not-found / model not supported
- (Dev-only) Telemetry: log `modelUsed` + thời gian xử lý cho mỗi request AI để debug nhanh.

### 7.2. P1 (nên làm sớm)

- RAG Tutor: incremental indexing theo `updatedAt` + batching/retry để giảm timeout.
- Tutor UI: empty state khi chưa có embeddings + hiển thị sources chi tiết hơn (preview/modal).
- Cache summary: review cache key theo (childId, windowDays, date range) để giảm số lần gọi AI.

### 7.3. P2 (nâng cấp)

- Anti-cheat summary bằng AI (tóm tắt log hành vi cho giáo viên).
- Nâng cấp Notifications: cân nhắc chuyển từ `SystemSetting` sang bảng riêng.
- PDF/Word parsing: hiện đã có quiz upload MVP; nếu mở rộng thêm pipeline parsing thì cần tối ưu để tránh timeout serverless.

---

## 8. Tham chiếu (khi cần đọc sâu)

- `docs/ADMIN.md`: mô tả chi tiết phân hệ Admin Portal.
- `docs/UPDATE.md`: bối cảnh/ý tưởng AI (lưu ý: có thể khác một số chi tiết so với code hiện tại).
- Entry points quan trọng (đối chiếu nhanh trong code):
  - AI: `src/app/api/ai/*`
  - Cron: `src/app/api/cron/*`
  - RAG chunking/embedding: `src/lib/rag/chunkText.ts`, `src/lib/ai/gemini-embedding.ts`
