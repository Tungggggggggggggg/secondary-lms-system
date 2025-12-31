# EduVerse (Secondary LMS System)

Nền tảng LMS dành cho học sinh với mô hình **đa vai trò** (Giáo viên / Học sinh / Phụ huynh / Admin), hỗ trợ quản lý lớp học, khóa học, bài tập (tự luận + trắc nghiệm), thông báo, nhắn tin, file đính kèm và các tính năng AI (tutor theo bài học, gợi ý chấm tự luận, tóm tắt chống gian lận, tóm tắt tuần cho phụ huynh).

## Tính năng chính

- **Xác thực & phân quyền**: NextAuth (Credentials) + tùy chọn Google OAuth; middleware điều hướng dashboard theo vai trò.
- **Lớp học / Khóa học / Bài học**: quản lý nội dung bài học; hỗ trợ đính kèm tệp.
- **Bài tập**:
  - **Tự luận (ESSAY)**: nộp bài dạng văn bản và/hoặc nộp bài dạng tệp.
  - **Trắc nghiệm (QUIZ)**: ngân hàng câu hỏi; theo dõi attempt; ghi nhận sự kiện thi.
- **Chống gian lận (Anti-cheat)**: thu thập `exam_events` và sinh báo cáo/tóm tắt.
- **AI** (Google Gemini):
  - Gợi ý chấm bài tự luận.
  - Tutor cho học sinh dựa trên RAG (lesson embeddings + pgvector).
  - Tóm tắt chống gian lận.
  - Tóm tắt tuần cho phụ huynh.
- **Thông báo & nhắc hạn**: hệ thống notification + cron nhắc hạn nộp bài.
- **Chat**: hội thoại DM/TRIAD/GROUP, hỗ trợ tệp đính kèm.

## Công nghệ sử dụng

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Prisma** + **PostgreSQL** (có `pgvector` cho RAG)
- **NextAuth** (JWT session)
- **Supabase Storage** (lưu file submissions/attachments/chat)
- **Google Gemini API** (`@google/generative-ai`)
- **TailwindCSS** + Radix UI
- **Vitest** (unit tests)

## Yêu cầu hệ thống

- **Node.js**: 20.x (CI đang dùng Node 20)
- **PostgreSQL**: khuyến nghị dùng Supabase/Postgres có thể bật `vector` extension

## Cài đặt & chạy dự án

1) Cài dependencies

```bash
npm install
```

2) Cấu hình môi trường

- Tạo file `.env` ở thư mục gốc (file này đang được `.gitignore`, không commit lên repo).
- Xem mục **Cấu hình môi trường** bên dưới để điền các biến cần thiết.

3) Khởi tạo database + migrations

```bash
npx prisma generate
npx prisma migrate dev
```

4) (Tùy chọn) Seed dữ liệu mẫu

```bash
npx prisma db seed
```

5) Chạy dev server

```bash
npm run dev
```

Mở `http://localhost:3000`.

## Cấu trúc thư mục (khái quát)

- `src/app`: App Router pages + API routes.
- `src/app/api`: Backend endpoints (auth, classrooms, assignments, chat, cron, ai,...).
- `src/lib`: Prisma client, auth options, Supabase client, AI helpers, repositories.
- `prisma/`: Prisma schema, migrations, seed.

## Cấu hình môi trường (Environment variables)

Tạo file `.env` tại root dự án (file này đang được `.gitignore`, không commit).

### Database (Prisma/PostgreSQL)

- `DATABASE_URL` (**bắt buộc**): connection string Postgres.
- `DIRECT_URL` (khuyến nghị): direct connection string (phục vụ migrations). Nếu không dùng có thể set giống `DATABASE_URL`.

### Auth (NextAuth)

- `NEXTAUTH_SECRET` (**bắt buộc**): secret cho JWT/session.
- `GOOGLE_CLIENT_ID` (tùy chọn): bật đăng nhập Google OAuth.
- `GOOGLE_CLIENT_SECRET` (tùy chọn): đi kèm `GOOGLE_CLIENT_ID`.

### Supabase (Storage)

- `NEXT_PUBLIC_SUPABASE_URL` (**bắt buộc**)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (**bắt buộc**)
- `SUPABASE_SERVICE_ROLE` (**bắt buộc cho server**) — dùng để upload + tạo signed URL (không được expose ra client).

Buckets (tùy theo cách bạn tổ chức, có default fallback):

- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` (mặc định `lms-submissions`) — client side (ví dụ trang nộp bài).
- `SUPABASE_STORAGE_BUCKET` (server) — ưu tiên cho submissions/attachments.
- `SUPABASE_ASSIGNMENTS_BUCKET` — bucket cho file bài học/bài tập.
- `SUPABASE_ANNOUNCEMENTS_BUCKET` — bucket cho file thông báo.
- `SUPABASE_LESSONS_BUCKET` — bucket cho file bài học.
- `SUPABASE_CHAT_BUCKET` (mặc định `chat-files`) — bucket cho file chat.

### AI (Google Gemini)

- `GEMINI_API_KEY` (**bắt buộc nếu dùng AI**) — dùng cho tutor/RAG, chấm tự luận, anti-cheat summary, parent weekly summary.

### Cron / Background jobs

- `CRON_SECRET` (**bắt buộc nếu gọi cron endpoints**) — gửi qua header `x-cron-secret` hoặc `Authorization: Bearer <CRON_SECRET>`.

### Email (SMTP - Gmail)

- `EMAIL_USER` (tùy chọn)
- `EMAIL_PASS` (tùy chọn)

### Seed dữ liệu (tùy chọn)

- `SEED_USERS` = `1|true` để cho phép tạo user demo.
- `SEED_CLEANUP_LEGACY_USERS` = `1|true` để “dọn” các user `@example.com` cũ.
- `SEED_DRY_RUN` = `1|true` để chạy seed ở chế độ không ghi DB.

## Prisma, migrations & pgvector

- Dev:

```bash
npx prisma generate
npx prisma migrate dev
```

- Production:

```bash
npx prisma generate
npx prisma migrate deploy
```

Hệ thống có migration bật `pgvector` và tạo bảng `lesson_embedding_chunks` (phục vụ RAG tutor). Nếu bạn tự host Postgres, hãy đảm bảo extension `vector` được phép cài đặt.

## Supabase Storage

- Tạo các bucket tương ứng (submissions/assignments/announcements/lessons/chat) trong Supabase.
- Các API server dùng `SUPABASE_SERVICE_ROLE` để upload và tạo signed URL.
- Giới hạn upload hiện tại: **20MB/tệp** (áp dụng cho submissions/chat/attachments).

## Nộp bài dạng file (File submissions)

Luồng chính:

- **Học sinh upload file**: `POST /api/submissions/upload?assignmentId=<id>` (multipart `file`).
- **Lưu metadata** (draft/submitted): `POST /api/submissions` với body `{ assignmentId, status?: "draft"|"submitted", files: [...] }`.
- **Xác nhận nộp**: `PUT /api/submissions` với body `{ assignmentId }`.

Endpoints liên quan:

- `GET /api/submissions?assignmentId=<id>`: lấy submission hiện tại (kèm file) của học sinh.
- `GET /api/submissions/signed-url?path=<storagePath>`: học sinh lấy signed URL cho file của chính mình.
- `GET /api/assignments/[id]/file-submissions`: giáo viên xem danh sách bài nộp dạng file cho assignment.
- `GET /api/submissions/[submissionId]/files`: giáo viên lấy signed URLs để tải file.

UI tham khảo:

- Học sinh: `src/app/dashboard/student/assignments/[id]/submit/page.tsx`
- Giáo viên: `src/app/dashboard/teacher/assignments/[id]/submissions/files/page.tsx`

## AI & RAG

- Tutor (student-only): `POST /api/ai/tutor/chat`
- Anti-cheat summary (teacher-only): `POST /api/ai/anti-cheat/summary`

Index embeddings:

- Theo course (teacher-only): `POST /api/teachers/courses/[courseId]/index-embeddings`
- Theo lịch (cron): `GET/POST /api/cron/index-lesson-embeddings`

## Cron jobs

- Nhắc hạn nộp bài: `GET/POST /api/cron/assignment-deadline-reminders`
- Tóm tắt tuần cho phụ huynh: `GET/POST /api/cron/parent-weekly-summary`
- Index embeddings: `GET/POST /api/cron/index-lesson-embeddings`

Lưu ý: các cron endpoints yêu cầu `CRON_SECRET`. Repo có `vercel.json` cấu hình lịch chạy cho `assignment-deadline-reminders`.

## Scripts

- `npm run dev`: chạy local dev.
- `npm run build`: build production.
- `npm run start`: chạy production server.
- `npm run lint`: lint (Next.js).
- `npm run test`: chạy unit tests (Vitest).
- `npm run test:watch`: chạy vitest watch.
- `npm run postinstall`: hook tự chạy sau khi cài dependency (Prisma generate).
- `npx prisma db seed`: chạy seed (`prisma/seed.js`). Có thể kiểm soát hành vi bằng các biến `SEED_*`.

## CI

GitHub Actions: `.github/workflows/ci.yml`

- Cài dependencies (`npm ci || npm install`)
- `npx prisma generate`
- Lint
- `npx vitest run`

## Deploy

Khuyến nghị deploy trên **Vercel**:

- Thiết lập đầy đủ env vars (đặc biệt: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `SUPABASE_*`, `GEMINI_API_KEY`, `CRON_SECRET`).
- `vercel.json` có cấu hình cron.

## Troubleshooting

- **`Supabase admin client is not available`**:
  - Thiếu `SUPABASE_SERVICE_ROLE` hoặc thiếu `NEXT_PUBLIC_SUPABASE_URL`.
- **Cron trả về 401 Unauthorized**:
  - Thiếu header `x-cron-secret` hoặc sai `CRON_SECRET`.
- **Lỗi vector/pgvector**:
  - Đảm bảo migration chạy thành công và database cho phép `CREATE EXTENSION vector;`.
- **AI trả 502/500**:
  - Kiểm tra `GEMINI_API_KEY` và quota (có thể gặp 429 Too Many Requests).