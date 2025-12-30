# Báo cáo hệ thống: Secondary LMS System (EduVerse)

# 1. Giới thiệu đề tài

## Lý do chọn đề tài
Hệ thống quản lý học tập (LMS) cho bậc THCS có nhu cầu cao do:
- Quản lý lớp học, bài học, bài tập và tương tác giáo viên–học sinh–phụ huynh thường rời rạc.
- Nhu cầu số hóa quy trình giao bài – nộp bài – chấm điểm – theo dõi tiến độ.
- Bài toán thi/kiểm tra trực tuyến cần cơ chế giám sát và ghi nhận sự kiện “đáng ngờ”.
- Xu hướng ứng dụng AI để hỗ trợ học tập (tutor), gợi ý chấm điểm và tóm tắt báo cáo.

## Mục tiêu của đồ án
Mục tiêu của hệ thống EduVerse (theo codebase hiện tại):
- Cung cấp nền tảng LMS web cho 4 nhóm người dùng: **Teacher / Student / Parent / Admin**.
- Quản lý lớp học, khóa học, bài học và bài tập (ESSAY/QUIZ).
- Hỗ trợ nộp bài theo nhiều dạng:
  - Nộp nội dung (text-based submissions).
  - Nộp tệp (file-based submissions) lưu trên Supabase Storage.
- Tích hợp các module AI:
  - **AI Tutor** (RAG) dựa trên embedding bài học.
  - **AI gợi ý chấm điểm** cho bài tự luận.
  - **AI tóm tắt chống gian lận** dựa trên log sự kiện thi.
  - **AI tóm tắt tuần cho phụ huynh** theo lịch (cron).
- Tự động nhắc hạn nộp bài và gửi thông báo.

## Đối tượng và phạm vi nghiên cứu
- **Đối tượng nghiên cứu**: quy trình dạy – học – tương tác phụ huynh trong bối cảnh LMS; cơ chế ghi log sự kiện thi; ứng dụng LLM (Gemini) cho RAG và tóm tắt.
- **Phạm vi**: codebase hiện tại là một ứng dụng Next.js full-stack (UI + API routes), sử dụng PostgreSQL qua Prisma và Supabase (DB + Storage).

# 2. Tổng quan công nghệ sử dụng

## Ngôn ngữ lập trình
- TypeScript
- JavaScript (một số file như `prisma/seed.js`)

## Framework / Thư viện
- Next.js `14.2.33` (App Router)
- React 18
- NextAuth `^4.24.11` (xác thực)
- Prisma `^6.19.0` (ORM)
- Zod (validate dữ liệu API)
- TailwindCSS (UI)
- Radix UI (UI primitives)
- SWR (fetching/caching ở client)
- Chart.js + react-chartjs-2 (biểu đồ)
- Supabase JS `^2.76.1` (tương tác Storage/DB service)
- @google/generative-ai `^0.24.1` (Gemini)
- Nodemailer (gửi email)
- Vitest (test)

## Database
- PostgreSQL (datasource Prisma)
- Hạ tầng DB hiện thể hiện qua `.env` sử dụng Supabase PostgreSQL (kèm `pgbouncer=true`).

## Công cụ phát triển
- ESLint
- Vitest
- Prisma Migrate + Prisma Generate
- Vercel (có `vercel.json`, sử dụng Cron)

## Mô hình kiến trúc
- **Client–Server** theo kiểu “monolith full-stack” trong Next.js:
  - **Frontend**: các page/component trong `src/app` và `src/components`.
  - **Backend**: API Routes trong `src/app/api/**`.
  - **Data layer**: Prisma Client truy cập PostgreSQL.
- **RESTful API** (đa số endpoint theo chuẩn JSON, HTTP verbs GET/POST/PUT/DELETE).
- **RBAC (Role-based access control)**: phân quyền theo `UserRole` (TEACHER/STUDENT/PARENT/ADMIN), kiểm soát qua `middleware.ts` và kiểm tra role trong API.

# 3. Phân tích hệ thống

## Các actor
- **Student**: học sinh tham gia lớp, làm bài/quiz, nộp bài, xem điểm, dùng AI tutor.
- **Teacher**: tạo lớp, tạo khóa học/bài học, giao bài, chấm điểm, xem submissions, theo dõi chống gian lận, nhắn tin.
- **Parent**: liên kết với học sinh, xem tiến độ/kết quả, nhận nhắc hạn, nhắn tin với giáo viên.
- **Admin**: quản trị người dùng/lớp/organization, cấu hình hệ thống, xem audit logs, thống kê.

## Chức năng chính của từng actor

### Student
- Đăng ký/đăng nhập (NextAuth Credentials/Google).
- Chọn vai trò sau đăng nhập (`/auth/select-role`) và được điều hướng theo vai trò (middleware).
- Tham gia lớp học (join theo code).
- Xem lớp, bài học, làm quiz.
- Nộp bài:
  - Nộp text (bảng `assignment_submissions`).
  - Nộp file (bảng `submissions` + `submission_files`, file lưu Supabase Storage).
- Gửi sự kiện thi (anti-cheat events) khi làm quiz (endpoint `/api/exam-events`).
- Dùng **AI Tutor**: `/api/ai/tutor/chat` (RAG dựa trên embedding bài học).

### Teacher
- Quản lý lớp học: tạo/sửa, quản lý danh sách học sinh.
- Quản lý khóa học/bài học: tạo lesson, upload file lesson.
- Giao bài:
  - Tạo assignment `ESSAY` hoặc `QUIZ` (`/api/assignments/create`).
  - Gán bài cho các lớp (bảng `assignment_classrooms`).
  - Tạo câu hỏi/đáp án quiz (bảng `questions`, `question_options`).
- Chấm điểm:
  - Xem danh sách submissions (gộp cả text-based và file-based) tại `/api/assignments/[id]/submissions`.
  - AI gợi ý chấm điểm bài ESSAY: `/api/ai/grade`.
- Chống gian lận:
  - Nhận cảnh báo theo eventType (notification `TEACHER_ANTI_CHEAT_ALERT`).
  - Xem sự kiện thi: `/api/exam-events` (teacher-only).
  - AI tóm tắt chống gian lận cho quiz: `/api/ai/anti-cheat/summary`.
- Nhắn tin/chat (conversations/messages, kèm file đính kèm).

### Parent
- Gửi yêu cầu liên kết với học sinh (link request): `/api/parent/link-requests`.
- Theo dõi tiến độ/điểm số và các sự kiện sắp tới.
- Nhận thông báo nhắc hạn nộp bài cho con.
- Nhận tóm tắt tuần bằng AI (cron).
- Nhắn tin trực tiếp với giáo viên (hệ thống kiểm tra parent chỉ được nhắn với giáo viên có liên quan đến con).

### Admin
- Quản trị hệ thống thông qua `/api/admin/**`.
- Quản lý người dùng (khoá/mở khoá, reset mật khẩu).
- Quản lý lớp học, organization, settings.
- Xem audit logs và thống kê (admin dashboard đọc từ `/api/admin/stats`).

## Luồng nghiệp vụ tổng quát của hệ thống
- Người dùng đăng ký/đăng nhập → chọn vai trò → vào dashboard theo vai trò.
- Teacher tạo lớp/khóa học/bài học → gán khóa học vào lớp.
- Teacher tạo assignment (ESSAY/QUIZ) → gán vào lớp.
- Student vào lớp → xem bài tập → làm quiz / nộp bài (text hoặc file).
- Khi làm quiz: Student gửi `exam_events` (TAB_SWITCH, COPY, DEVTOOLS_OPEN...) → Teacher nhận cảnh báo & có thể xem log + AI tóm tắt.
- Hệ thống chạy cron:
  - Nhắc hạn nộp bài (24h/3h/quá hạn) cho học sinh + phụ huynh.
  - Index embedding bài học để AI Tutor tra cứu.
  - Tóm tắt tuần cho phụ huynh.

## Input/Output của hệ thống (mô hình y = f(x))

Phần này mô tả hệ thống EduVerse dưới góc nhìn “hệ thống biến đổi dữ liệu”:
- **x (Input)**: dữ liệu đi vào hệ thống từ người dùng/hạ tầng.
- **f (Process)**: các tầng xử lý (auth → phân quyền → API → DB/Storage → thông báo/cron).
- **y (Output)**: dữ liệu trả về người dùng và các thay đổi trạng thái hệ thống.

### x — Input (đầu vào thực tế)

- **Input từ người dùng (UI → API)**
  - Đăng nhập/đăng ký và chọn vai trò (**Teacher/Student/Parent/Admin**).
  - Teacher tạo/cập nhật bài tập (ESSAY/QUIZ), nhập nội dung/cấu hình/câu hỏi/đáp án.
  - Student nộp bài dạng text hoặc upload file.
  - Student gửi log sự kiện thi (`exam_events`) khi làm quiz.
  - Người dùng gửi/nhận tin nhắn (chat), có thể kèm tệp đính kèm.
  - Parent gửi yêu cầu liên kết với học sinh.

- **Input từ hạ tầng/cấu hình**
  - **Session/JWT/cookies** từ NextAuth.
  - **Headers/IP/User-Agent** phục vụ bảo mật và rate limit.
  - **Biến môi trường (.env)** (ví dụ: DB connection, NextAuth secret, Supabase keys, `CRON_SECRET`, `GEMINI_API_KEY`).

- **Input từ dữ liệu hệ thống (DB hiện có)**
  - Dữ liệu người dùng, lớp học, khóa học/bài học, bài tập, bài nộp, điểm/feedback.
  - Dữ liệu chat (conversations/messages), notifications.
  - Dữ liệu giám sát thi (`exam_events`).

### f — Process (hàm xử lý)

- **Xác thực & phân quyền**
  - NextAuth xác thực và tạo session.
  - Middleware điều hướng/chặn truy cập theo role.

- **Xử lý nghiệp vụ qua API routes** (`src/app/api/**`)
  - Validate input (Zod), kiểm tra quyền (role/ownership/membership).
  - Đọc/ghi dữ liệu bằng Prisma (PostgreSQL).
  - Upload/đọc file bằng Supabase Storage (kèm signed URL).
  - Tạo notifications/audit logs cho các hành động quan trọng.

- **Tác vụ nền (Cron)**
  - Nhắc deadline.
  - Index embeddings bài học (phục vụ tutor).
  - Tóm tắt tuần cho phụ huynh.

### y — Output (đầu ra thực tế)

- **Output trả về ngay cho người dùng**
  - UI hiển thị dashboard, danh sách lớp/bài học/bài tập, bài nộp, tin nhắn, thống kê.
  - API JSON (GET/POST/PUT/DELETE) cho từng nghiệp vụ.
  - Signed URL để tải file nộp bài/đính kèm (hết hạn theo thời gian).

- **Output dạng side effects (thay đổi trạng thái hệ thống)**
  - Ghi DB: tạo/cập nhật/xóa các bản ghi (users, classrooms, assignments, submissions, exam_events, messages, notifications...).
  - Ghi file lên Supabase Storage.
  - Ghi audit log cho AI/Cron và các hành động nhạy cảm.
  - Tạo notifications (nhắc hạn, cảnh báo anti-cheat, tin nhắn, thông báo cho phụ huynh).

### Bảng Actor → Input → Xử lý → Output (tóm tắt)

| Actor | Input (x) | Xử lý chính (f) | Output (y) |
|---|---|---|---|
| Student | Đăng nhập, chọn role; nộp bài text/file; gửi `exam_events`; gửi tin nhắn | Auth + RBAC; API validate; Prisma ghi DB; upload Supabase; tạo notification | Danh sách bài tập/bài nộp; signed URL; lịch sử sự kiện thi; chat messages; notifications |
| Teacher | Tạo/sửa assignment; xem submissions; xem `exam_events`; gửi tin nhắn | Auth + kiểm tra ownership; Prisma truy vấn/gộp dữ liệu; tạo notification/audit | Danh sách submissions; thống kê/monitor thi; signed URL tải bài nộp; chat; notifications |
| Parent | Gửi link request; xem tiến độ/nhắc hạn; nhận tóm tắt tuần | Auth + kiểm tra quan hệ parent–student; Prisma snapshot; cache/notify (cron) | Thống kê theo con; notifications nhắc hạn; weekly summary (cron) |
| Admin | Quản trị người dùng/lớp/tổ chức/settings; xem audit logs | Auth + RBAC admin; API `/api/admin/**`; Prisma đọc/ghi | Số liệu hệ thống, audit logs, trạng thái người dùng/cấu hình |
| Cron (Vercel) | Trigger theo lịch + `CRON_SECRET` | Chạy các endpoint `/api/cron/**` để gửi nhắc hạn, index embeddings, weekly summary | Notifications tự động; cập nhật cache/embeddings; báo cáo trạng thái cron (JSON) |

# 4. Thiết kế hệ thống

## 4.1. Thiết kế kiến trúc

### Sơ đồ kiến trúc (mô tả bằng chữ)
- **Trình duyệt (User)**
  - Render UI React/Next.js (App Router).
  - Gọi API qua fetch/SWR.
- **Next.js Server (Node.js runtime)**
  - Middleware phân quyền (`src/middleware.ts`).
  - API Routes (`src/app/api/**`) xử lý nghiệp vụ.
  - Prisma Client (`src/lib/prisma.ts`) truy vấn PostgreSQL.
  - Tích hợp Gemini qua `@google/generative-ai`.
- **PostgreSQL (Supabase)**
  - Lưu dữ liệu nghiệp vụ (users, classrooms, assignments, submissions, chat...).
- **Supabase Storage**
  - Lưu file nộp bài/đính kèm chat/đính kèm lesson.
  - Server tạo signed URL để tải file (bảo mật).
- **Vercel Cron**
  - Gọi các endpoint `/api/cron/**` theo lịch.

### Phân chia frontend / backend / database
- **Frontend**:
  - `src/app/**` (pages/layout) và `src/components/**`.
  - Dashboard theo vai trò: `src/app/dashboard/{teacher|student|parent|admin}`.
- **Backend**:
  - `src/app/api/**` (REST endpoints).
  - `src/lib/repositories/**` (data access layer cho nhiều module).
  - `src/lib/ai/**`, `src/lib/rag/**`, `src/lib/exam-session/**`.
- **Database**:
  - Prisma schema: `prisma/schema.prisma`.
  - Migrations: `prisma/migrations/**`.

## 4.2. Thiết kế cơ sở dữ liệu

> Nguồn: `prisma/schema.prisma`.

### Danh sách bảng (model)
- `users`
- `sessions`
- `password_resets`
- `classrooms`
- `classroom_students`
- `courses`
- `lessons`
- `lesson_attachments`
- `lesson_embedding_chunks` (vector embeddings)
- `assignments`
- `assignment_classrooms`
- `assignment_files`
- `questions`
- `question_options`
- `question_comments`
- `assignment_submissions` (nộp text + grade/feedback)
- `assignment_attempts` (attempt quiz + config)
- `exam_events` (log chống gian lận)
- `announcements`
- `announcement_comments`
- `announcement_attachments`
- `submissions` (nộp file)
- `submission_files`
- `organizations`
- `organization_members`
- `audit_logs`
- `parent_students` (liên kết phụ huynh–học sinh)
- `parent_student_invitations`
- `parent_student_link_requests`
- `system_settings`
- `notifications`
- `conversations`
- `conversation_participants`
- `messages`
- `chat_attachments`

### Mô tả vai trò từng bảng (tóm tắt)
- `users`: tài khoản người dùng, có `role` và `roleSelectedAt`.
- `sessions`: session token (phục vụ NextAuth adapter; tuy session strategy đang dùng JWT).
- `password_resets`: token reset mật khẩu.

- `classrooms`: lớp học (có `code` join), gắn `teacherId`, có thể gắn `organizationId`.
- `classroom_students`: bảng liên kết nhiều-nhiều lớp–học sinh.

- `courses`: khóa học (tác giả/teacher), có lessons.
- `lessons`: nội dung bài học.
- `lesson_attachments`: file đính kèm bài học.
- `lesson_embedding_chunks`: chia nhỏ nội dung lesson và lưu embedding dạng `vector` để tra cứu RAG.

- `assignments`: bài tập/quiz (type ESSAY/QUIZ), có mở/đóng (openAt/lockAt/dueDate), cấu hình chống gian lận `anti_cheat_config`.
- `assignment_classrooms`: gán bài tập vào lớp.
- `assignment_files`: file liên quan assignment (đính kèm/submit… tùy `file_type`).
- `questions`, `question_options`: cấu trúc quiz.
- `question_comments`: bình luận theo câu hỏi.

- `assignment_submissions`: bài nộp dạng text, có `grade`/`feedback`. (Trong API, bảng này còn được dùng để lưu điểm/feedback cho cả nộp file bằng cách tạo record “placeholder”.)
- `submissions`, `submission_files`: bài nộp dạng file + danh sách file (lưu storagePath).

- `assignment_attempts`: attempt của quiz (seed/config, time limit, status).
- `exam_events`: log sự kiện trong quá trình làm quiz (TAB_SWITCH, COPY, DEVTOOLS_OPEN...).

- `announcements`, `announcement_comments`, `announcement_attachments`: bảng tin lớp.

- `organizations`, `organization_members`: tổ chức và phân quyền trong tổ chức (OrgRole).
- `audit_logs`: ghi nhận hành động quan trọng (AI usage, cron, thay đổi role...).
- `system_settings`: cấu hình hệ thống (ví dụ `disabled_users`).
- `notifications`: thông báo trong hệ thống (nhắc hạn, cảnh báo anti-cheat, tin nhắn...).

- `conversations`, `conversation_participants`, `messages`, `chat_attachments`: module nhắn tin.

- `parent_students`, `parent_student_link_requests`, `parent_student_invitations`: cơ chế liên kết phụ huynh–học sinh.

### Quan hệ giữa các bảng (mô tả)
- `User` 1–N `Classroom` (teacher tạo lớp).
- `Classroom` N–N `User(STUDENT)` qua `classroom_students`.
- `Course` 1–N `Lesson`.
- `Classroom` N–N `Course` qua `classroom_courses`.
- `Assignment` N–N `Classroom` qua `assignment_classrooms`.
- `Assignment` 1–N `Question` 1–N `Option`.
- `Assignment` 1–N `AssignmentSubmission` (text).
- `Assignment` 1–N `Submission` 1–N `SubmissionFile` (file).
- `Assignment` 1–N `ExamEvent` (log cho quiz, theo student).
- `User(PARENT)` N–N `User(STUDENT)` qua `parent_students` (và có cơ chế request/invitation).
- `Conversation` N–N `User` qua `conversation_participants`; `Conversation` 1–N `Message`.

## 4.3. Thiết kế giao diện

### Các màn hình chính (theo cấu trúc `src/app`)
- Landing page: `src/app/page.tsx` (giới thiệu, CTA đăng ký/đăng nhập).
- Auth:
  - `/auth/login`
  - `/auth/register`
  - `/auth/select-role`
- Dashboard theo vai trò:
  - Teacher: `src/app/dashboard/teacher/**` (dashboard, classrooms, courses, assignments, exams/monitor, messages, profile, students...)
  - Student: `src/app/dashboard/student/**` (dashboard, classes, assignments, grades, family, messages, profile...)
  - Parent: `src/app/dashboard/parent/**` (dashboard, children, progress, teachers, messages, profile...)
  - Admin: `src/app/dashboard/admin/**` (dashboard, users, classrooms, organizations, settings, audit-logs...)
- Maintenance page: `/maintenance`.

### Vai trò từng màn hình
- **Landing**: giới thiệu hệ thống, dẫn tới đăng ký/đăng nhập.
- **Auth**: xác thực và chọn vai trò.
- **Teacher dashboard**: KPI lớp học/bài tập/hoạt động gần đây.
- **Student dashboard**: lớp học, bài tập sắp tới, hoạt động gần đây.
- **Parent dashboard**: thống kê nhanh, danh sách con, tiến độ học tập.
- **Admin dashboard**: tổng quan hệ thống, phân bố người dùng theo role.

### Luồng điều hướng
- Sau đăng nhập:
  - Nếu chưa chọn role (`roleSelectedAt` chưa có) → chuyển tới `/auth/select-role`.
  - Nếu đã chọn role → chuyển tới dashboard tương ứng:
    - TEACHER → `/dashboard/teacher/dashboard`
    - STUDENT → `/dashboard/student/dashboard`
    - PARENT → `/dashboard/parent/dashboard`
    - ADMIN → `/dashboard/admin/dashboard`
- Chặn truy cập chéo role: middleware tự redirect về dashboard hợp lệ.

# 5. Cài đặt và triển khai

## Cấu trúc thư mục code
- `src/app`: pages/layout (Next.js App Router) + API routes (`src/app/api`).
- `src/components`: UI components theo domain (admin/teacher/student/parent/chat/landing...).
- `src/lib`:
  - `prisma.ts`: Prisma client singleton.
  - `auth-options.ts`: cấu hình NextAuth.
  - `api-utils.ts`: helper auth, errorResponse, logging wrapper, check quyền.
  - `repositories/**`: data access cho audit/chat/notifications/parent-linking/... 
  - `ai/**`: tích hợp Gemini (grade/tutor/anti-cheat/parent-summary).
  - `rag/**`: chunk + index embeddings.
  - `exam-session/**`: logic chống gian lận (scoring...).
- `prisma/`: `schema.prisma`, migrations, `seed.js`.

## Các module/chức năng chính (theo API routes)
- Auth & user:
  - `/api/auth/[...nextauth]` (NextAuth).
  - `/api/auth/register`, `/api/auth/login`.
  - `/api/users/role` (chọn vai trò).
- Classroom/Course/Lesson:
  - `/api/classrooms/**`, `/api/teachers/classrooms/**`, `/api/teachers/courses/**`.
- Assignments/Submissions:
  - `/api/assignments/create`, `/api/assignments/[id]`, `/api/assignments/[id]/submissions`.
  - `/api/submissions/upload`, `/api/submissions/[submissionId]/files`, `/api/submissions/signed-url`.
- Anti-cheat:
  - `/api/exam-events`.
  - `/api/ai/anti-cheat/summary`.
- AI:
  - `/api/ai/tutor/chat` (RAG tutor).
  - `/api/ai/grade` (gợi ý chấm điểm).
  - `/api/ai/parent/summary` (tùy module).
- Chat:
  - `/api/chat/conversations`, `/api/chat/messages`, attachments.
- Cron:
  - `/api/cron/assignment-deadline-reminders` (Vercel cron).
  - `/api/cron/index-lesson-embeddings`.
  - `/api/cron/parent-weekly-summary`.
- Admin:
  - `/api/admin/**` (users, classrooms, organizations, stats, settings, audit logs...).

## Cách hệ thống xử lý một nghiệp vụ tiêu biểu: Nộp bài dạng file + giáo viên xem

### Bước 1: Học sinh upload file
- UI tham chiếu trong README: `src/app/dashboard/student/assignments/[assignmentId]/submit/page.tsx`.
- API upload: `POST /api/submissions/upload?assignmentId=...`
  - Kiểm tra đăng nhập và role STUDENT.
  - Validate file size (<= 20MB) và whitelist mimeType.
  - Upload lên Supabase Storage theo key:
    - `submissions/{assignmentId}/{studentId}/{uuid}-{safeName}`
  - Trả về `storagePath`, `fileName`, `mimeType`, `sizeBytes`.

### Bước 2: Ghi nhận bài nộp trong DB
- Hệ thống có model `Submission` + `SubmissionFile`.
- Endpoint ghi nhận cụ thể nằm trong nhóm `/api/submissions/**` và `/api/assignments/**` (codebase có cơ chế đọc danh sách gộp).

### Bước 3: Giáo viên xem danh sách bài nộp
- API: `GET /api/assignments/[id]/submissions` (teacher-only)
  - Lấy cả:
    - `assignment_submissions` (text).
    - `submissions` (file) + đếm số file.
  - Gộp kết quả thành 1 danh sách chung.

### Bước 4: Giáo viên tải file
- API: `GET /api/submissions/[submissionId]/files`
  - Teacher-only, kiểm tra teacher sở hữu assignment.
  - Trả về danh sách file kèm **signed URL (10 phút)** từ Supabase Storage.

# 6. Kết quả đạt được

## Những chức năng đã hoàn thành (theo code)
- Xác thực tài khoản:
  - Credentials login (email/password) và Google OAuth (khi có env).
  - Chọn vai trò và điều hướng theo vai trò (middleware).
- Quản lý lớp học/khóa học/bài học (có model và API routes).
- Quản lý bài tập:
  - Tạo ESSAY/QUIZ, gán lớp.
  - Quiz có question/options đa dạng (SINGLE/MULTIPLE/TRUE_FALSE/FILL_BLANK).
- Nộp bài:
  - Nộp text và nộp file (Supabase Storage).
  - Giáo viên xem/tải bài nộp qua signed URLs.
- Chống gian lận cho quiz:
  - Student ghi log `exam_events`.
  - Teacher xem log và nhận cảnh báo.
  - AI tóm tắt mức độ nghi vấn.
- AI Tutor (RAG) dựa trên `lesson_embedding_chunks`.
- Cron:
  - Nhắc hạn nộp bài.
  - Index embeddings.
  - Tóm tắt tuần cho phụ huynh.
- Chat giữa các vai trò (có kiểm soát quyền cho parent).
- Admin dashboard + quản trị API `/api/admin/**`.

## Mức độ đáp ứng mục tiêu ban đầu
- Hệ thống đã có đầy đủ “xương sống” LMS (auth, lớp, bài học, bài tập, nộp bài, thông báo).
- Điểm nổi bật trong codebase là các module AI (Tutor/Grading/Anti-cheat/Parent summary) và cron tự động.

## Hình ảnh minh họa (mô tả vị trí cần chèn ảnh)
- (Hình 6.1) Landing page: `src/app/page.tsx`.
- (Hình 6.2) Màn hình chọn vai trò: `/auth/select-role`.
- (Hình 6.3) Teacher dashboard: `/dashboard/teacher/dashboard`.
- (Hình 6.4) Student dashboard: `/dashboard/student/dashboard`.
- (Hình 6.5) Parent dashboard: `/dashboard/parent/dashboard`.
- (Hình 6.6) Trang monitor chống gian lận: `/dashboard/teacher/exams/monitor`.
- (Hình 6.7) Màn hình chat: `/dashboard/*/messages`.

# 7. Hạn chế và hướng phát triển

## Hạn chế hiện tại của hệ thống (rút ra từ code)
- Codebase có **hai mô hình submission** song song:
  - `assignment_submissions` (text-based, có grade/feedback).
  - `submissions/submission_files` (file-based).
  - API hiện gộp 2 nguồn, và có logic “lọc placeholder” → có thể gây phức tạp bảo trì.
- AI phụ thuộc vào cấu hình `GEMINI_API_KEY`; nếu thiếu key hoặc bị rate limit sẽ ảnh hưởng tính năng.
- Chống gian lận hiện dựa vào **log sự kiện** từ client (TAB_SWITCH/COPY/DEVTOOLS_OPEN…), mức độ tin cậy phụ thuộc môi trường trình duyệt.
- Cần quản lý tốt cấu hình môi trường (env) khi triển khai.

## Đề xuất cải tiến trong tương lai
- Chuẩn hóa 1 mô hình submissions thống nhất (text/file/metadata/grade) để giảm độ phức tạp.
- Bổ sung dashboard phân tích anti-cheat nâng cao:
  - Biểu đồ timeline sự kiện.
  - So sánh giữa nhiều học sinh/attempt.
- Mở rộng AI tutor:
  - Lưu lịch sử hội thoại theo từng lesson.
  - Tích hợp citation rõ ràng theo đoạn nguồn.
- Tăng cường bảo mật & vận hành:
  - Chuẩn hóa quản trị secrets.
  - Giới hạn quyền truy cập signed URL theo vai trò, ghi audit đầy đủ.

# 8. Kịch bản thuyết trình bảo vệ (RẤT QUAN TRỌNG)

## Tổng thời lượng: 10–15 phút (gợi ý 12 slide)

### Slide 1 — Tiêu đề
- Nội dung:
  - Tên đề tài: Hệ thống quản lý học tập THCS EduVerse.
  - Nhóm thực hiện, GVHD.
- Lời nói gợi ý:
  - “Hôm nay em trình bày hệ thống EduVerse: một LMS full-stack có tích hợp AI tutor, auto-grading và giám sát thi.”

### Slide 2 — Bối cảnh & vấn đề
- Nội dung:
  - Khó khăn trong quản lý giao bài–nộp bài–theo dõi tiến độ.
  - Thi online cần cơ chế ghi nhận sự kiện nghi vấn.
- Lời nói:
  - “Nếu chỉ dùng nhiều công cụ rời rạc sẽ khó tổng hợp và theo dõi xuyên suốt.”

### Slide 3 — Mục tiêu
- Nội dung:
  - 4 vai trò: Teacher/Student/Parent/Admin.
  - Quản lý lớp–khóa học–bài học–bài tập.
  - Nộp bài text/file.
  - Anti-cheat + AI.
- Lời nói:
  - “Mục tiêu là tối ưu luồng học tập và bổ sung AI để giảm tải cho giáo viên.”

### Slide 4 — Kiến trúc tổng quan
- Nội dung:
  - Next.js full-stack: UI + API routes.
  - Prisma + PostgreSQL (Supabase).
  - Supabase Storage cho file.
  - Vercel cron.
- Lời nói:
  - “Điểm mạnh là triển khai gọn trong một codebase: frontend và backend chung nền tảng.”

### Slide 5 — Công nghệ sử dụng
- Nội dung:
  - Next.js 14, NextAuth, Prisma, Tailwind, SWR.
  - Gemini API cho AI.
- Lời nói:
  - “Các công nghệ được chọn nhằm tăng tốc phát triển và đảm bảo khả năng mở rộng.”

### Slide 6 — Phân quyền & điều hướng
- Nội dung:
  - `middleware.ts` điều hướng dashboard theo role.
  - Cơ chế chọn role (`/auth/select-role`, API `/api/users/role`).
- Lời nói:
  - “Hệ thống đảm bảo người dùng chỉ vào đúng phân hệ của mình.”

### Slide 7 — Module lớp học/khóa học/bài học
- Nội dung:
  - Classroom có code join, teacher sở hữu.
  - Course–Lesson, file đính kèm.
- Lời nói:
  - “Đây là nền tảng dữ liệu để AI tutor có thể tra cứu.”

### Slide 8 — Module bài tập & nộp bài
- Nội dung:
  - Assignment ESSAY/QUIZ.
  - Nộp bài text hoặc file.
  - Teacher xem submissions và chấm điểm.
- Lời nói:
  - “API gộp 2 kiểu submissions để giáo viên thao tác trên một danh sách thống nhất.”

### Slide 9 — Anti-cheat (giám sát thi)
- Nội dung:
  - Student gửi `exam_events`.
  - Teacher nhận cảnh báo notification.
  - Teacher xem log và AI summary.
- Lời nói:
  - “Chống gian lận ở đây là ghi nhận tín hiệu đáng ngờ để hỗ trợ giáo viên ra quyết định.”

### Slide 10 — AI trong hệ thống
- Nội dung:
  - AI Tutor (RAG) dựa trên `lesson_embedding_chunks`.
  - AI gợi ý chấm ESSAY.
  - AI tóm tắt tuần cho phụ huynh.
- Lời nói:
  - “AI được giới hạn theo role và có rate limit để đảm bảo ổn định.”

### Slide 11 — Cron & Thông báo
- Nội dung:
  - Nhắc deadline 24h/3h/quá hạn.
  - Index embeddings.
  - Weekly summary.
- Lời nói:
  - “Cron giúp hệ thống chủ động, thay vì phụ thuộc thao tác thủ công.”

### Slide 12 — Kết quả, hạn chế, hướng phát triển
- Nội dung:
  - Những phần đã xong.
  - Hạn chế: song song 2 model submissions.
  - Hướng phát triển: chuẩn hóa submissions, nâng cấp anti-cheat dashboard, nâng cấp tutor.
- Lời nói:
  - “Trong tương lai, hệ thống sẽ tối ưu data model và nâng chất lượng giám sát/AI.”

## Câu hỏi hội đồng & gợi ý trả lời

### Q1: Vì sao chọn công nghệ này?
- Gợi ý trả lời:
  - Next.js cho phép xây dựng full-stack nhanh: UI + API routes chung repo.
  - NextAuth giảm công sức triển khai auth và session.
  - Prisma giúp quản lý schema/migrations và truy vấn type-safe.
  - Supabase tiện cho PostgreSQL + Storage + signed URL.

### Q2: Hệ thống có gì nổi bật?
- Gợi ý trả lời:
  - Tích hợp AI theo nhiều điểm chạm:
    - Tutor (RAG) dựa trên embedding bài học.
    - Gợi ý chấm điểm tự luận.
    - Tóm tắt chống gian lận dựa trên exam events.
    - Tóm tắt tuần cho phụ huynh.
  - Có cron nhắc hạn và tự index embeddings.
  - Có cơ chế chat kiểm soát quyền cho phụ huynh.

### Q3: Nếu mở rộng thì em sẽ làm gì?
- Gợi ý trả lời:
  - Chuẩn hóa data model submissions và quy trình chấm điểm.
  - Mở rộng anti-cheat: thêm thống kê theo lớp/attempt, dashboard timeline.
  - Mở rộng tổ chức (organization) và phân quyền theo OrgRole.
  - Tối ưu AI: cache kết quả, lưu lịch sử tutor, citation nguồn rõ ràng.
