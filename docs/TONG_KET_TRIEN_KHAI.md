# HANDOVER / TỔNG KẾT TRIỂN KHAI (Secondary LMS System)

**Mục đích:** tài liệu bàn giao nhanh để người tiếp theo setup môi trường, chạy demo, chạy test và biết rõ việc cần làm tiếp.

**Cập nhật lần cuối:** 2025-12-13

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
- **Seed hiện tại không tạo user role `ADMIN`** (các email demo “admin/superadmin” đang là `TEACHER`).

Việc cần làm ngay nếu muốn demo Admin portal:

- Tạo hoặc chọn 1 user bất kỳ, set `role = ADMIN` bằng Prisma Studio hoặc SQL update.

---

## 4. Những tính năng chính đã hoàn tất

- **Onboarding bắt buộc chọn role**: redirect `/auth/select-role` theo `roleSelectedAt`.
- **Admin portal (global)**: route guard + stats + users + audit logs + ban/unban.
- **Admin classroom management (global)**:
  - Danh sách lớp `/dashboard/admin/classrooms` (lọc active/archived, tìm kiếm, phân trang) + Archive/Unarchive.
  - Trang chi tiết lớp `/dashboard/admin/classrooms/[id]` (overview + actions + quản lý học sinh).
  - Chỉnh sửa lớp (name/code/maxStudents) + validate + check code unique.
  - Đổi giáo viên phụ trách.
  - Thêm học sinh hàng loạt (text/CSV `fullname,email`) + tuỳ chọn tự tạo tài khoản nếu email chưa có.
  - Export CSV danh sách học sinh.
  - Xóa học sinh (single + bulk multi-select) và hiển thị dialog chi tiết các dòng không thêm được (email + lý do).
  - Quy tắc lớp lưu trữ: khoá thao tác thay đổi (UI disable + API guard), chỉ cho phép xem/export/khôi phục.
- **System settings**: maintenance mode + global announcement.
- **Notifications (MVP)**: API + UI bell.
- **AI (Gemini)**:
  - Quiz generator: `POST /api/ai/quiz` (teacher-only).
  - Essay grading suggestion: `POST /api/ai/grade` (teacher-only).
  - Parent smart summary: `POST /api/ai/parent/summary` (parent-only).

---

## 5. Tests hiện có

- Vitest config: `vitest.config.ts`
- Smoke tests: `tests/smoke/*.test.ts`
  - AI quiz/grade/parent summary (mock Gemini)
  - settingsRepo cache
  - session-manager

---

## 6. Known issues / lưu ý vận hành

- **AI parent summary đôi khi trả về text lẫn JSON**:
  - Đã tăng độ chịu lỗi của parser tại `src/lib/ai/gemini-parent-summary.ts`.
- **Trang điểm số phụ huynh có thể chậm do truy vấn DB**:
  - Đã thêm timeout 20s trong `src/hooks/use-parent-grades.ts` để tránh loading vô hạn.

---

## 7. Việc cần làm tiếp theo (ưu tiên)

### 7.1. P0 (nên làm ngay)

- Chuẩn hoá seed để có ít nhất 1 user `ADMIN` (hoặc hướng dẫn tạo ADMIN rõ ràng).
- Tối ưu endpoint điểm số phụ huynh (`/api/parent/children/[childId]/grades`) nếu gặp SLOW QUERY.

### 7.1b. Checklist trạng thái triển khai (Admin)

- [x] Admin Users: list/filter/search/paginate.
- [x] Admin Users: Ban/Unban.
- [x] Admin Users: Reset password (API + UI).
- [x] Admin Users: Create Teacher + Bulk Create Teacher (UI dạng dialog).
- [x] Admin Classrooms: list + archive/unarchive.
- [x] Admin Classrooms: detail page + edit classroom + change teacher.
- [x] Admin Classrooms: bulk add students (CSV fullname,email) + export CSV.
- [x] Admin Classrooms: remove students (single + bulk multi-select).
- [ ] Admin Classrooms: Force delete classroom (chưa triển khai).

### 7.2. P1 (nên làm sớm)

- Viết checklist test thủ công cho AI + system settings (UI + API).
- Bổ sung unit tests cho các schema/parse util khác nếu phát sinh.

### 7.3. P2 (nâng cấp)

- Nâng cấp Notifications: cân nhắc chuyển từ `SystemSetting` sang bảng riêng.
- RAG tutor / pipeline PDF/Word: chỉ làm nếu còn thời gian, tránh timeout serverless.

---

## PHỤ LỤC (lịch sử triển khai chi tiết)

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

**Ghi chú vận hành:** đã bổ sung migration backfill để set `roleSelectedAt = createdAt` cho user cũ (những record đang `NULL`) nhằm tránh bắt user cũ chọn role lại.

### 0.2. Hardening vận hành (Error handling, Logging, Notifications) (đã hoàn tất)
- Chuẩn hoá helper `errorResponse()` theo format lỗi thống nhất:
  - `{ "success": false, "error": true, "message": "...", "details": ... }`.
- Giảm log nhạy cảm trong `middleware.ts`:
  - Chỉ log ở môi trường development.
  - Bỏ log `userId`.
  - Sửa logic `hasSelectedRole` để không coi `undefined` là đã chọn role.
- Chuẩn hoá response lỗi + validate input cho một số API quan trọng:
  - `/api/admin/stats`, `/api/admin/audit-logs`, `/api/admin/users`, `/api/admin/users/bulk`, `/api/admin/users/[id]/status`.
  - `/api/users/role` (validate bằng zod, chặn leo thang quyền, ghi audit, đồng thời tạo notification demo sau khi chọn role).
  - `/api/ai/quiz` (validate bằng zod, trả lỗi thống nhất).
  - `/api/auth/reset-password/*` (chuẩn hoá lỗi, validate rõ ràng).
- Notifications MVP (phục vụ UI `NotificationBell`):
  - Lưu notifications theo user thông qua `SystemSetting` key `notifications:{userId}` (không cần migration DB).
  - Triển khai API:
    - `GET /api/notifications`
    - `GET/PATCH /api/notifications/[id]`
    - `POST /api/notifications/mark-all-read`
  - UI `NotificationBell` đã gọi API để “Đánh dấu đã đọc tất cả” (persist thay vì chỉ local).
- Reset password hardening:
  - Tránh user enumeration: email không tồn tại vẫn trả 200 với message chung.
  - UI reset-password ưu tiên đọc `message` và vẫn hỗ trợ `details`.

**Kết quả kiểm tra:** `npm run lint` OK, `npm run build` OK.

### 0.3. AI Auto-grading (MVP) (đã hoàn tất)
- Triển khai API `POST /api/ai/grade` (teacher-only, check ownership assignment) để sinh **gợi ý chấm bài tự luận (ESSAY)**.
- Output trả về JSON đã validate bằng `zod`: `{ score: 0..10, feedback, corrections[] }`.
- UI: tích hợp nút **“AI gợi ý chấm”** trong dialog chấm bài (`GradeSubmissionDialog`) để giáo viên:
  - Gọi AI lấy gợi ý.
  - Bấm “Áp dụng gợi ý” để đổ vào ô điểm/nhận xét.
  - Giáo viên **tự quyết định** bấm “Lưu điểm” (không auto-save).

**Kết quả kiểm tra:** `npm run lint` OK, `npm run build` OK.

### 0.4. Smart summary on-demand cho phụ huynh (MVP) (đã hoàn tất)
- Triển khai API `POST /api/ai/parent/summary` (parent-only, check liên kết `ParentStudent` status `ACTIVE`) để tạo **tóm tắt học tập** theo khoảng thời gian (14/30/60 ngày).
- Có rate limit tối thiểu + audit log action `AI_PARENT_SMART_SUMMARY`.
- Output JSON được parse + validate bằng `zod` (title/summary/highlights/concerns/actionItems/questionsForTeacher/trend).
- UI: thêm nút **“AI tóm tắt học tập”** ở trang điểm số của con `/dashboard/parent/children/[childId]/grades` và hiển thị dialog kết quả (loading/error/retry).

**Kết quả kiểm tra:** `npm run lint` OK, `npm run build` OK.

### 0.5. System Settings UI (Maintenance mode + Global announcement) (đã hoàn tất)
- Admin UI: `/dashboard/admin/settings` cho phép bật/tắt:
  - Maintenance mode (kèm message tuỳ chọn)
  - Global announcement (banner tuỳ chọn)
- Admin API: `GET/PUT /api/admin/settings` (admin-only, zod validate, audit log, rate limit).
- Client API: `GET /api/system/settings` (authenticated) để dashboard fetch và hiển thị banner/maintenance gate.
- Tích hợp vào layout: `DashboardLayout` hiển thị banner cho mọi role và chặn nội dung khi maintenance (non-admin).

**Kết quả kiểm tra:** `npm run lint` OK, `npm run build` OK.

### 0.6. Polish demo: Sửa lỗi hiển thị tiếng Việt (mojibake) cho Parent dashboard (đã hoàn tất)
- Sửa các chuỗi UI/toast bị lỗi encoding trên các trang Parent:
  - `/dashboard/parent/dashboard`
  - `/dashboard/parent/children`
  - `/dashboard/parent/children/[childId]`
  - `/dashboard/parent/children/[childId]/grades`
  - `/dashboard/parent/progress`
  - `/dashboard/parent/teachers`
  - `/dashboard/parent/profile`
- Mục tiêu: đảm bảo tiếng Việt hiển thị đúng, nội dung demo rõ ràng hơn.

**Kết quả kiểm tra:** `npm run lint` OK, `npm run build` OK.

### 0.7. Smoke tests + tối ưu hiệu năng nhẹ (đã hoàn tất)
- Thiết lập **Vitest**:
  - Thêm `vitest.config.ts` và scripts:
    - `npm test`
    - `npm run test:watch`
  - Tạo smoke test tại `tests/smoke/session-manager.test.ts`.
- Fix bug runtime trong `shuffleWithSeed` (swap an toàn) để test chạy ổn định.
- Tối ưu performance/UX cho Parent dashboard:
  - Giảm request thừa bằng cấu hình `useSWR` (`revalidateOnFocus: false`, `dedupingInterval`, `keepPreviousData`).
  - Giảm lag khi tìm kiếm ở trang điểm số bằng `useDeferredValue`.
  - Thêm `AbortController` + tránh `setState` sau unmount trong `useParentGrades`.

**Kết quả kiểm tra:** `npm test` OK, `npm run lint` OK, `npm run build` OK.

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
- Đã bổ sung `roleSelectedAt` vào JWT/session để phục vụ onboarding bắt buộc chọn vai trò.
- Đã bổ sung role `ADMIN` trong `enum UserRole` (Prisma) và đưa vào JWT/session.
- `middleware.ts` đang điều hướng/chặn theo `UserRole` gồm: `TEACHER`, `STUDENT`, `PARENT`, `ADMIN` và:
  - Bảo vệ `/dashboard/admin/*` chỉ cho phép `ADMIN`.
  - Bảo vệ `/api/admin/*` chỉ cho phép `ADMIN`.
  - Chuẩn hoá truy cập `/dashboard/admin` → `/dashboard/admin/dashboard`.

---

## 3. Tổng hợp đề xuất & đánh giá khả thi (theo từng chức năng)

## A. Phân hệ Admin Portal (từ `docs/ADMIN.md`)

### A1) Bảo vệ route admin
**Mục tiêu:** chỉ Admin mới vào được `/dashboard/admin/*` và `/api/admin/*`.

**Trạng thái triển khai:**
- ĐÃ bổ sung `ADMIN` vào `enum UserRole` trong Prisma.
- ĐÃ cập nhật `middleware.ts` để:
  - Map `ADMIN -> /dashboard/admin/dashboard`.
  - Chặn cross-role khi truy cập `/dashboard/admin/*` và `/api/admin/*`.

### A2) Dashboard overview (stats)
**Mục tiêu:** thống kê tổng quan (users/classes/storage…)

**Trạng thái triển khai:**
- ĐÃ sử dụng `src/lib/repositories/reports-repo.ts` để xây dựng API `GET /api/admin/stats`.
- ĐÃ có trang `/dashboard/admin/dashboard` hiển thị tổng users, lớp học, bài tập, tổ chức và số tài khoản bị khoá.

### A3) User Management
**Mục tiêu:** list/filter/paginate + ban/unban + create teacher + reset password.

**Trạng thái triển khai:**
- **List/filter/paginate:**
  - ĐÃ có `GET /api/admin/users` liệt kê user toàn hệ thống với phân trang, lọc theo `role` và tìm kiếm theo email/họ tên.
  - Trang `/dashboard/admin/users` hiển thị bảng người dùng, filter theo vai trò, search, phân trang.

- **Ban/Unban:**
  - ĐÃ triển khai `POST /api/admin/users/[id]/status` sử dụng `SystemSetting.disabled_users` để khoá/mở khoá tài khoản.
  - Ghi `AuditLog` với action `USER_BAN` / `USER_UNBAN`.
  - NextAuth + `getAuthenticatedUser()` chặn đăng nhập và API cho user bị disabled.

- **Create Teacher:**
  - ĐÃ sửa `userRepo.createUser()` để dùng `globalRole` (không còn hard-code `STUDENT`).
  - ĐÃ có `POST /api/admin/users` cho phép Admin tạo nhanh giáo viên mới (họ tên, email, mật khẩu), role = `TEACHER`.
  - UI `/dashboard/admin/users` có form "Tạo giáo viên mới".

- **Bulk Create Teacher:**
  - ĐÃ bổ sung `POST /api/admin/users/bulk` để tạo hàng loạt giáo viên từ danh sách/CSV.
  - UI hỗ trợ nhập danh sách text và kéo‑thả file CSV xuất từ Excel (**UI dạng dialog**).

- **Reset password:**
  - ĐÃ triển khai API `POST /api/admin/users/[id]/reset-password` (admin-only) để tạo mã reset và gửi email.
  - ĐÃ tích hợp UI nút "Reset mật khẩu" trong `/dashboard/admin/users`.

### A4) Classroom Management (archive/force delete)
- Archive tận dụng `Classroom.isActive`.
  - **Khả thi:** Cao.
  - **Trạng thái:** ĐÃ TRIỂN KHAI (UI + API guard + audit).
- Force delete:
  - **Khả thi:** Trung bình.
  - **Rủi ro:** cascade/quan hệ phức tạp, cần transaction + audit.
  - **Trạng thái:** CHƯA TRIỂN KHAI.

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
  - **Trạng thái:** ĐÃ TRIỂN KHAI.
  - API `POST /api/ai/quiz` sử dụng Gemini (`gemini-2.5-flash`) để sinh bộ câu hỏi trắc nghiệm từ nội dung bài học (paste text), có multi-call đảm bảo đủ số lượng câu hỏi, tránh trùng lặp.
  - UI cho giáo viên đã tích hợp nút "Tạo câu hỏi bằng AI" trong phần tạo bài Quiz.
- **Từ PDF/Word (upload):**
  - **Khả thi:** Trung bình (Vercel serverless dễ timeout).
  - **Trạng thái:** CHƯA TRIỂN KHAI, giữ nguyên khuyến nghị 2 bước: upload → extract text giới hạn → generate.

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
- ĐÃ thêm `ADMIN` vào `enum UserRole`.

### 4.2 NextAuth
- Đảm bảo `ADMIN` đi qua `jwt/session callbacks` (đang có sẵn luồng gán role).
- Nếu có file type augmentation cho NextAuth, cập nhật type để nhận `ADMIN`.

### 4.3 Middleware
- ĐÃ bảo vệ `/dashboard/admin/*` và `/api/admin/*` chỉ cho phép `ADMIN`.
- ĐÃ thêm redirect normalize `/dashboard/admin` → `/dashboard/admin/dashboard`.

### 4.4 Ngăn leo thang quyền
- Endpoint đổi role (`/api/users/role`) tuyệt đối **không cho phép set `ADMIN`** (đã kiểm tra logic hiện tại).

### 4.5 Khởi tạo Admin
- Khuyến nghị: tạo admin qua seed hoặc SQL manual (không hardcode password trong repo).

---

## 5. Roadmap triển khai khuyến nghị (phù hợp Vercel + demo đồ án)

### Giai đoạn 1 (ưu tiên cao, nhanh ra kết quả)
1) Global Admin foundation (Prisma + middleware + route guard). **→ ĐÃ HOÀN THÀNH**
2) Admin Stats + Audit logs + User list. **→ ĐÃ HOÀN THÀNH**
3) Ban/Unban bằng `SystemSetting.disabled_users`. **→ ĐÃ HOÀN THÀNH**
4) AI Quiz Generator từ text. **→ ĐÃ HOÀN THÀNH**
5) Hardening vận hành (chuẩn hoá lỗi + giảm logging nhạy cảm). **→ ĐÃ HOÀN THÀNH**
6) Notifications MVP (đủ để UI hoạt động đúng nghĩa). **→ ĐÃ HOÀN THÀNH**
7) AI Auto-grading (gợi ý chấm tự luận, teacher approve). **→ ĐÃ HOÀN THÀNH (MVP)**

### Giai đoạn 2
1) Create teacher đúng mapping role. **→ ĐÃ HOÀN THÀNH (sửa `userRepo.createUser` + API/Admin UI)**
2) Reset password + audit (audit log + rate limiting tối thiểu + policy không lộ thông tin). **→ ĐÃ HOÀN THÀNH**
3) Smart summary on-demand cho phụ huynh. **→ ĐÃ HOÀN THÀNH (MVP)**
4) System settings UI (maintenance mode / global announcement). **→ ĐÃ HOÀN THÀNH**

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

Onboarding chọn role bắt buộc + Admin portal cơ bản + AI Quiz generator đã hoàn tất.

Bạn muốn mình **triển khai tiếp** milestone nào?
- (A) AI Auto-grading (gợi ý chấm tự luận, teacher approve)
- (B) Reset password + audit (chuẩn hoá policy + audit log + rate limit tối thiểu)
- (C) System settings UI (maintenance mode / global announcement)

Khuyến nghị: ưu tiên (A) để tăng điểm nhấn AI cho demo, sau đó làm (B) để hoàn thiện bảo mật/vận hành.

---

## 8. Danh sách hạng mục còn lại cần triển khai (Backlog)

### 8.1. Các hạng mục rất cao đã hoàn thành
- Global Admin (`ADMIN`) theo `docs/ADMIN.md`:
  - Prisma: đã thêm `ADMIN` vào `enum UserRole`.
  - Middleware: đã bảo vệ `/dashboard/admin/*`, `/api/admin/*`.
  - Admin pages + APIs: đã có stats, audit logs, user list.
- User Management:
  - Đã sửa `userRepo.createUser()` để tạo Teacher đúng role (không còn hard-code `STUDENT`).
  - Đã triển khai Ban/Unban dùng `SystemSetting.disabled_users` + ghi audit `USER_BAN/USER_UNBAN`.

### 8.2. Ưu tiên cao
- Reset password + audit:
  - Đã bổ sung rate limiting tối thiểu theo IP/email và ghi audit log cho các bước reset-password.
- Admin reset password (từ Admin portal):
  - ĐÃ triển khai API `POST /api/admin/users/[id]/reset-password` (admin-only) để tạo mã reset và gửi email.
  - ĐÃ tích hợp UI nút "Reset mật khẩu" trong `/dashboard/admin/users`.
- System settings UI (maintenance mode / global announcement):
  - ĐÃ có trang `/dashboard/admin/settings` và API `/api/admin/settings`.

### 8.3. Ưu tiên trung bình
- Nâng cấp Notifications:
  - Hiện đang là MVP lưu trong `SystemSetting` (dễ triển khai, không migrate).
  - Nếu cần mở rộng: chuyển sang bảng `Notification` + API mark-read/mark-all-read chuẩn + (optional) SSE.
- Backfill `roleSelectedAt` cho user cũ (nếu không muốn bắt user cũ chọn lại role): set `roleSelectedAt = createdAt`.

### 8.4. Ưu tiên theo demo/đồ án (AI)
- AI Quiz generator từ text (làm trước PDF/Word).
- AI Auto-grading (teacher approve, validate bằng zod).
- Smart summary phụ huynh (on-demand trước cron). **→ ĐÃ HOÀN THÀNH (MVP)**

