# TỔNG KẾT PHÂN TÍCH & KẾ HOẠCH TRIỂN KHAI (Secondary LMS System)

**Nguồn tổng hợp:** `docs/UPDATE.md`, `docs/ADMIN.md` + đối chiếu codebase hiện tại.

---

## 0. Cập nhật triển khai gần nhất (đã hoàn tất)

### 0.1. Onboarding bắt buộc chọn vai trò (Role Selection)
- Thêm trường `User.roleSelectedAt` để đánh dấu user đã hoàn tất bước chọn vai trò.
- NextAuth đã đưa `roleSelectedAt` vào JWT/session để middleware có thể đọc được.
- Middleware đã được cập nhật để:
  - User đã đăng nhập nhưng chưa có `roleSelectedAt` sẽ bị chuyển tới `/auth/select-role`.
  - User đã có `roleSelectedAt` sẽ không vào lại `/auth/select-role`.
  - Chặn truy cập `/auth/select-role` nếu chưa đăng nhập.
- API `PUT /api/users/role` đã set `roleSelectedAt = now()` khi user chọn role.
- UI Login/Register/Select Role đã bỏ hack `localStorage`:
  - Register auto-login và đi thẳng sang `/auth/select-role`.
  - Login redirect theo `roleSelectedAt`.
  - Select Role chuyển đúng về `/dashboard/{role}/dashboard` và bỏ delay.

**Ghi chú vận hành:** user cũ (đã tồn tại trước khi thêm field) sẽ có `roleSelectedAt = null` và sẽ bị yêu cầu chọn role 1 lần.

---

## 1. Quyết định đã chốt

### 1.1. Admin toàn hệ thống (Global Admin)
- Admin là **vai trò global** (không phụ thuộc Organization).
- Mục tiêu: có một phân hệ quản trị tập trung cho vận hành/giám sát/cấu hình hệ thống.

### 1.2. Môi trường deploy
- Deploy trên **Vercel** (Next.js 14 App Router).
- Hệ quả kỹ thuật:
  - Hạn chế tác vụ nặng trong request (parse PDF lớn, embedding hàng loạt, job dài).
  - Ưu tiên “on-demand” hoặc **Cron** (Vercel Cron) + endpoint bảo vệ bằng secret.

---

## 2. Hiện trạng hệ thống (những thứ đã có sẵn trong codebase)

### 2.1. Nền tảng dữ liệu & audit/settings
- **Audit log đã có:** `model AuditLog` trong Prisma.
  - Helper/repo:
    - `src/lib/logging/audit.ts`
    - `src/lib/repositories/audit-repo.ts` (có sanitize metadata)
- **System settings đã có:** `model SystemSetting` (value là `Json?`).
  - Đã được dùng để chặn user thông qua key `disabled_users` trong `getAuthenticatedUser()`.

### 2.2. Nền anti-cheat/monitoring
- DB có:
  - `ExamEvent`, `AssignmentAttempt`, `Assignment.anti_cheat_config`.
- API event logs:
  - `src/app/api/exam-events/route.ts`.
- Rule-based suspicious detection:
  - `src/lib/exam-session/suspicious-behavior.ts`.
- UI giám sát thi:
  - `src/components/teacher/exam/ExamMonitoringDashboard.tsx` (hiện dùng mock data).

### 2.3. Nền bài tập/quiz
- Quiz builder đã khá đầy đủ:
  - `src/components/teacher/assignments/QuizContentBuilder.tsx`.
- Endpoint tạo assignment:
  - `src/app/api/assignments/create/route.ts`.

### 2.4. NextAuth + middleware hiện tại
- NextAuth đang đưa `role` vào `token` và `session`.
- `middleware.ts` đang điều hướng/chặn theo `UserRole` gồm: `TEACHER`, `STUDENT`, `PARENT`.
- Đã bổ sung `roleSelectedAt` vào JWT/session để phục vụ onboarding bắt buộc chọn vai trò.
- **Chưa có role `ADMIN` trong `enum UserRole`**.

---

## 3. Tổng hợp đề xuất & đánh giá khả thi (theo từng chức năng)

## A. Phân hệ Admin Portal (từ `docs/ADMIN.md`)

### A1) Bảo vệ route admin
**Mục tiêu:** chỉ Admin mới vào được `/dashboard/admin/*` và `/api/admin/*`.

- **Cần làm (bắt buộc):**
  - Thêm `ADMIN` vào `enum UserRole`.
  - Cập nhật `middleware.ts`:
    - mapping `ADMIN -> /dashboard/admin/dashboard`
    - chặn cross-role khi vào `/dashboard/admin/*`.
- **Khả thi:** Cao.
- **Rủi ro:** nếu lọc role không kỹ có thể mở lộ admin routes.

### A2) Dashboard overview (stats)
**Mục tiêu:** thống kê tổng quan (users/classes/storage…)

- **Nền đã có:** `src/lib/repositories/reports-repo.ts`.
- **Cần làm:** tạo API `/api/admin/stats` + trang admin dashboard.
- **Khả thi:** Cao.

### A3) User Management
**Mục tiêu:** list/filter/paginate + ban/unban + create teacher + reset password.

- **List/filter/paginate:**
  - Nền đã có: `userRepo.listByOrganization()` (hiện theo org) → khi Global Admin, cần bổ sung list toàn hệ thống hoặc cho phép bỏ filter org.
  - **Khả thi:** Cao.

- **Ban/Unban:**
  - Tài liệu đề xuất `User.active`, nhưng hệ thống hiện dùng `SystemSetting.disabled_users`.
  - **Quick win khuyến nghị:**
    - Ban: thêm `userId` vào `SystemSetting(key=disabled_users)`.
    - Unban: xoá khỏi danh sách.
    - Ghi audit `USER_BAN/USER_UNBAN`.
  - **Khả thi:** Cao.
  - **Rủi ro:** list JSON lớn (chấp nhận được với quy mô đồ án).

- **Create Teacher:**
  - Có `userRepo.createUser()` nhưng có dấu hiệu mapping role chưa đúng (đang hard-code `User.role` thành `STUDENT`).
  - **Khả thi:** Trung bình → Cao (cần sửa mapping role).

- **Reset password:**
  - Có model `PasswordReset` + `nodemailer`.
  - **Khả thi:** Cao (cần quy trình token/hạn dùng/audit).

### A4) Classroom Management (archive/force delete)
- Archive tận dụng `Classroom.isActive`.
  - **Khả thi:** Cao.
- Force delete:
  - **Khả thi:** Trung bình.
  - **Rủi ro:** cascade/quan hệ phức tạp, cần transaction + audit.

### A5) Audit logs UI
- Nền DB + repo đã có.
- **Khả thi:** Cao.

### A6) System settings UI (maintenance mode, global announcement)
- `SystemSetting` đã có.
- **Maintenance mode:** Trung bình (cần middleware allowlist login/health).
- **Global announcement:** Trung bình (cần thiết kế nơi render + scope).

---

## B. Nâng cấp AI (từ `docs/UPDATE.md`)

### B1) AI Auto-Grading (gợi ý chấm tự luận)
- **Giá trị:** giảm tải giáo viên.
- **Phù hợp dữ liệu:** có `AssignmentSubmission.content`, `grade`, `feedback`.
- **Triển khai đề xuất:**
  - API `/api/ai/grade` (teacher-only + check ownership assignment).
  - Structured output JSON và validate bằng `zod`.
  - UI: “AI gợi ý chấm” → giáo viên chỉnh sửa trước khi lưu.
- **Khả thi:** Cao.
- **Rủi ro:** hallucination/prompt injection → giảm bằng teacher approve + validation.

### B2) AI Quiz Generator
- **Từ text (paste):**
  - **Khả thi:** Cao (nên làm trước).
- **Từ PDF/Word (upload):**
  - **Khả thi:** Trung bình (Vercel serverless dễ timeout).
  - **Khuyến nghị:** 2 bước: upload → extract text giới hạn → generate.

### B3) RAG Tutor (pgvector + embeddings)
- **Khả thi:** Trung bình → Thấp nếu thời gian ít.
- **Lý do:** cần thiết kế table embeddings, chunking, pipeline cập nhật khi lesson thay đổi, retrieval query + streaming.
- **Khuyến nghị:** để Giai đoạn 3 hoặc làm demo phạm vi nhỏ (1 course, on-demand indexing).

### B4) Anti-cheat + AI analysis
- **Tracking + rule-based flagging:** Cao (nền đã có).
- **AI analysis:** Trung bình.
- **Khuyến nghị:** dùng AI để **tóm tắt log** cho giáo viên đọc nhanh, không dùng AI để “kết tội”.

### B5) Smart Summary cho phụ huynh (tuần)
- **Khả thi:**
  - On-demand: Cao.
  - Tự động hàng tuần (cron): Trung bình (cần Vercel Cron + secret).
- **Rủi ro:** privacy + AI bịa → bắt buộc giới hạn dữ liệu + validate.

---

## 4. Các thay đổi kỹ thuật bắt buộc (Global Admin)

### 4.1 Prisma
- Thêm `ADMIN` vào `enum UserRole`.

### 4.2 NextAuth
- Đảm bảo `ADMIN` đi qua `jwt/session callbacks` (đang có sẵn luồng gán role).
- Nếu có file type augmentation cho NextAuth, cập nhật type để nhận `ADMIN`.

### 4.3 Middleware
- Bảo vệ `/dashboard/admin/*`.
- Thêm redirect normalize `/dashboard/admin` → `/dashboard/admin/dashboard`.

### 4.4 Ngăn leo thang quyền
- Endpoint đổi role (`/api/users/role`) tuyệt đối **không cho phép set `ADMIN`**.

### 4.5 Khởi tạo Admin
- Khuyến nghị: tạo admin qua seed hoặc SQL manual (không hardcode password trong repo).

---

## 5. Roadmap triển khai khuyến nghị (phù hợp Vercel + demo đồ án)

### Giai đoạn 1 (ưu tiên cao, nhanh ra kết quả)
1) Global Admin foundation (Prisma + middleware + route guard).
2) Admin Stats + Audit logs + User list.
3) Ban/Unban bằng `SystemSetting.disabled_users`.
4) AI Quiz Generator từ text.
5) AI Auto-grading (gợi ý chấm tự luận, teacher approve).

### Giai đoạn 2
1) Create teacher đúng mapping role.
2) Reset password + audit.
3) Smart summary on-demand cho phụ huynh.

### Giai đoạn 3
1) RAG Tutor (pgvector + embedding pipeline).
2) AI tóm tắt anti-cheat logs + dashboard hoàn thiện.
3) PDF/Word parsing pipeline tối ưu cho Vercel.

---

## 6. Checklist triển khai trên Vercel

- **ENV bắt buộc:**
  - `DATABASE_URL`
  - `NEXTAUTH_SECRET`
  - OAuth (nếu dùng Google): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **AI (khi làm):**
  - `GEMINI_API_KEY` (không commit, không hardcode).
- **Cron (nếu dùng):**
  - `CRON_SECRET` + endpoint `/api/cron/...` kiểm tra secret header.
- **Giới hạn request:**
  - Với parse file/AI: cắt nhỏ input, giới hạn size.
  - Tránh tác vụ > timeout serverless.

---

## 7. Việc cần bạn xác nhận trước khi code

Onboarding chọn role bắt buộc đã hoàn tất. Bạn muốn mình **triển khai tiếp** milestone nào?
- (A) Global Admin foundation + Admin Portal cơ bản (stats/users/audit + ban/unban)
- (B) AI Auto-grading (gợi ý chấm tự luận, teacher approve)
- (C) AI Quiz generator từ text

Khuyến nghị: bắt đầu từ (A) vì tạo nền phân quyền/quản trị, dễ demo, ít rủi ro.

---

## 8. Danh sách hạng mục còn lại cần triển khai (Backlog)

### 8.1. Ưu tiên rất cao (nên làm trước)
- Global Admin (`ADMIN`) theo `docs/ADMIN.md`:
  - Prisma: thêm `ADMIN` vào `enum UserRole`.
  - Middleware: bảo vệ `/dashboard/admin/*`, `/api/admin/*`.
  - Admin pages + APIs: stats, audit logs, user list.
- User Management:
  - Sửa `userRepo.createUser()` để tạo Teacher đúng role (tránh hard-code `STUDENT`).
  - Ban/Unban dùng `SystemSetting.disabled_users` + ghi audit `USER_BAN/USER_UNBAN`.

### 8.2. Ưu tiên cao
- Reset password end-to-end:
  - Hoàn thiện quy trình token/hạn dùng/audit và UI flow.
- Notifications module:
  - Hiện có API trả rỗng/`Not implemented` → cần triển khai tối thiểu (list/read/unread) để UI đúng nghĩa.

### 8.3. Ưu tiên trung bình
- Chuẩn hoá error format API theo quy ước `{ "error": true, "message": "...", "details": "..." }` và áp dụng dần cho các route quan trọng.
- Giảm log nhạy cảm / log quá nhiều ở middleware và API (chỉ log mức cần thiết).
- Backfill `roleSelectedAt` cho user cũ (nếu không muốn bắt user cũ chọn lại role): set `roleSelectedAt = createdAt`.

### 8.4. Ưu tiên theo demo/đồ án (AI)
- AI Quiz generator từ text (làm trước PDF/Word).
- AI Auto-grading (teacher approve, validate bằng zod).
- Smart summary phụ huynh (on-demand trước cron).

