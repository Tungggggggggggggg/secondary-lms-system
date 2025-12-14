# BÁO CÁO GIỚI THIỆU HỆ THỐNG

## 1. Tổng quan
**Tên dự án:** `secondary-lms-system`  
**Mô tả ngắn:** Hệ thống quản lý học tập (LMS) cho bậc THCS, tập trung vào 3 nhóm người dùng chính:
- Giáo viên (TEACHER)
- Học sinh (STUDENT)
- Phụ huynh (PARENT)

Hệ thống cung cấp các chức năng cốt lõi như: quản lý lớp học, quản lý học liệu/khóa học, giao & làm bài tập (Essay/Quiz), nộp bài (bao gồm nộp file qua Supabase Storage), thông báo/announcement, nhắn tin (chat) và theo dõi tiến độ.

## 2. Mục tiêu & phạm vi
### 2.1. Mục tiêu
- Hỗ trợ giáo viên tổ chức lớp học, giao bài và theo dõi kết quả.
- Hỗ trợ học sinh tham gia lớp, nhận bài tập, làm bài/nộp bài và xem tiến độ.
- Hỗ trợ phụ huynh liên kết với học sinh để theo dõi kết quả và trao đổi.

### 2.2. Phạm vi triển khai hiện tại (theo codebase)
- **Phân quyền theo vai trò** và điều hướng dashboard theo vai trò (Teacher/Student/Parent/Admin).
- **Lớp học**: tạo lớp, tham gia lớp bằng mã, danh sách lớp theo giáo viên/học sinh.
- **Bài tập**: tạo bài (Essay/Quiz), quản lý bài theo lớp, làm bài/nộp bài.
- **Nộp bài file-based**: upload file lên Supabase Storage, lưu metadata trong DB, tải xuống bằng signed URL.
- **Trao đổi**: announcement + bình luận + tệp đính kèm, chat (conversation/message/attachment).
- **Tài khoản**: đăng nhập/đăng ký/đổi mật khẩu, cập nhật profile, chọn vai trò.
- **Liên kết phụ huynh – học sinh**: invitation/link-request/quan hệ.
- **Theo dõi**: audit log, exam events (ghi nhận sự kiện thi/quiz), notifications.
- **Admin Portal (Global Admin)**:
  - Dashboard tổng quan (thống kê users/lớp/bài tập/tổ chức, số tài khoản bị khoá).
  - Quản lý người dùng: danh sách, lọc, tìm kiếm, Ban/Unban tài khoản.
  - Tạo giáo viên mới (Create Teacher) và tạo **hàng loạt giáo viên** từ danh sách/CSV (UI dạng dialog).
  - Quản lý lớp học toàn hệ thống: danh sách, lọc trạng thái (active/archived), tìm kiếm.
  - Trang chi tiết lớp `/dashboard/admin/classrooms/[id]`: overview + quản lý học sinh.
  - Thao tác lớp: chỉnh sửa lớp (name/code/maxStudents), đổi giáo viên, lưu trữ/khôi phục.
  - Học sinh theo lớp: thêm hàng loạt (text/CSV `fullname,email`), tự tạo tài khoản học sinh nếu email chưa có, export CSV, xoá học sinh (single/bulk).
  - Xem Audit Logs hệ thống.
- **AI Quiz Generator**: sinh câu hỏi trắc nghiệm từ nội dung bài học (paste text/file) bằng Google Gemini.
- **AI Tutor (RAG)** theo bài học: học sinh hỏi trên tab Tutor của mỗi bài, hệ thống truy vấn embeddings từ bảng `lesson_embedding_chunks` (pgvector) và sinh câu trả lời dựa trên nội dung bài học.

## 3. Công nghệ sử dụng (Tech stack)
### 3.1. Frontend
- **Next.js 14.2 (App Router)**
- **React 18**
- **TypeScript**
- **TailwindCSS** + `tailwindcss-animate`
- UI utilities: Radix UI (`@radix-ui/*`), `lucide-react`, `sonner`
- Data fetching: `swr`
- Biểu đồ: `chart.js` + `react-chartjs-2`

### 3.2. Backend
- **Next.js Route Handlers** (`src/app/api/...`)
- Xác thực: **NextAuth.js v4** (Credentials + Google)
- ORM: **Prisma**
- DB: **PostgreSQL**

### 3.3. Dịch vụ ngoài
- **Supabase Storage** phục vụ nộp bài dạng file (bucket mặc định: `lms-submissions`).

## 4. Kiến trúc & cấu trúc thư mục
### 4.1. Tổng quan kiến trúc
- Ứng dụng theo mô hình **Next.js App Router**:
  - UI pages nằm trong `src/app/...`
  - API nằm trong `src/app/api/...`
- Dữ liệu lưu trong PostgreSQL, truy cập qua Prisma.
- Xác thực & session do NextAuth quản lý.

### 4.2. Các thư mục chính
- `src/app/`:
  - `page.tsx`: landing page
  - `auth/`: login/register/reset-password/select-role
  - `dashboard/`: dashboard tách theo vai trò `teacher/student/parent`
  - `api/`: nhóm API theo module (classrooms, assignments, submissions, chat, users, ...)
  - `join/[code]/`: tham gia lớp bằng link có mã lớp
- `src/components/`:
  - `teacher/`, `student/`, `parent/`: các component theo vai trò
  - `auth/`: UI cho login/register/select-role
  - `shared/`, `ui/`: component dùng chung
- `src/lib/`:
  - `auth-options.ts`: cấu hình NextAuth
  - `prisma.ts`: Prisma client singleton
  - `api-utils.ts`: helper xác thực user ở API
- `prisma/schema.prisma`: mô hình dữ liệu

## 5. Xác thực, phân quyền & điều hướng
### 5.1. Xác thực (Authentication)
- NextAuth cấu hình tại `src/lib/auth-options.ts`.
- Hỗ trợ:
  - **CredentialsProvider** (email/password, hash bằng `bcryptjs`)
  - **GoogleProvider** (OAuth)

### 5.2. Phân quyền (Authorization) & redirect theo vai trò
- Middleware tại `src/middleware.ts`:
  - Nếu đã đăng nhập và truy cập `/auth/login` → tự redirect sang dashboard tương ứng.
  - Nếu truy cập `/dashboard` khi chưa đăng nhập → redirect về `/auth/login`.
  - Chặn cross-role (vd. user STUDENT vào `/dashboard/teacher/...`).

### 5.3. Dashboard theo vai trò
- Teacher: `/dashboard/teacher/dashboard`
- Student: `/dashboard/student/dashboard`
- Parent: `/dashboard/parent/dashboard`

## 6. Chức năng theo nhóm người dùng
## 6.1. Giáo viên (Teacher)
Các khu vực chính theo cấu trúc `src/app/dashboard/teacher/`:
- **Dashboard tổng quan** (thống kê/hoạt động gần đây)
- **Quản lý lớp học**: tạo lớp, xem danh sách lớp
- **Quản lý bài tập**: tạo bài (Essay/Quiz), gán vào lớp, theo dõi submissions
- **Khóa học/Course**: tạo & quản lý course/lesson (tùy phần UI hiện có)
- **Tin nhắn**: trao đổi qua chat
- **Quản lý học sinh**: danh sách/chi tiết theo lớp (tùy phần UI)

API liên quan (tóm tắt theo `src/app/api/...`):
- `GET/POST /api/classrooms`: teacher xem danh sách lớp / tạo lớp.
- `GET/POST /api/assignments`: teacher liệt kê / tạo bài tập.
- Nhóm `/api/teachers/...`: các endpoint phục vụ dashboard/assignments/classrooms.

## 6.2. Học sinh (Student)
Các khu vực chính theo `src/app/dashboard/student/`:
- **Dashboard**: thống kê, lớp học của tôi, bài sắp đến hạn
- **Classes/Lớp học**:
  - Xem danh sách lớp đã tham gia
  - **Tham gia lớp bằng mã**
  - Trang join nhanh bằng link: `/join/[code]` (tự động join nếu là học sinh)
- **Assignments/Bài tập**:
  - Xem danh sách bài
  - Xem chi tiết bài
  - **Nộp bài (file-based)** qua Supabase Storage
- **Grades/Điểm số**
- **Family** (tính năng liên quan phụ huynh – học sinh)
- **Tin nhắn**

API liên quan:
- Nhóm `/api/students/...`: assignments, classrooms, grades, questions, teachers.
- `GET/POST/PUT /api/submissions`: quản lý submission file-based (draft/submitted).

## 6.3. Phụ huynh (Parent)
Các khu vực chính theo `src/app/dashboard/parent/`:
- **Dashboard**: thống kê nhanh, danh sách con, tiến độ
- **Children/Con cái**: xem chi tiết từng học sinh liên kết
- **Progress/Tiến độ**: theo dõi kết quả học tập
- **Teachers/Giáo viên**: xem/trao đổi (tùy UI)
- **Tin nhắn**

API liên quan:
- Nhóm `/api/parent/...`: children, invitations, link-requests, teachers.

## 7. Các phân hệ nghiệp vụ chính
## 7.1. Lớp học (Classroom)
- Mỗi lớp có `code` (unique) để học sinh tham gia.
- Teacher có thể tạo lớp (có thể tự nhập `code` hợp lệ hoặc hệ thống tự sinh).
- Student tham gia bằng `code`.

## 7.2. Khóa học (Course) & bài học (Lesson)
- Course chứa nhiều lesson (`Lesson.order` để sắp xếp).
- Course có thể gắn vào lớp thông qua bảng liên kết.

## 7.3. Bài tập (Assignment)
- Hỗ trợ 2 loại `AssignmentType`:
  - `ESSAY`
  - `QUIZ`
- Nếu là QUIZ: gồm `Question` + `Option` (SINGLE/MULTIPLE/TRUE_FALSE/FILL_BLANK/ESSAY).
- Có các trường thời gian/điều kiện: `openAt`, `lockAt`, `dueDate`, `timeLimitMinutes`, `max_attempts`, `anti_cheat_config`.

## 7.4. Nộp bài & chấm điểm
Hệ thống đang có **2 nhóm dữ liệu submission**:
- `AssignmentSubmission`: lưu nội dung/điểm/feedback theo attempt (phù hợp bài tự luận/quiz theo mô hình truyền thống).
- `Submission` + `SubmissionFile`: phục vụ **nộp bài dạng file** (metadata file), liên kết Supabase Storage.

## 7.5. Announcement & tương tác
- Announcement theo lớp.
- Có comment và attachment.
- Có trạng thái moderation (`PENDING/APPROVED/REJECTED`).

## 7.6. Chat/Nhắn tin
- Conversation (DM/TRIAD/GROUP) + participants + message.
- Message hỗ trợ reply (parentId) + attachments.
- API mẫu: `/api/chat/messages` (list/send message theo conversationId).

## 7.7. Organization (mở rộng đa tổ chức)
- Có bảng `Organization` và `OrganizationMember`.
- Session hiện có đọc `orgId` từ cookie `x-org-id` (ở callback session).

## 8. Cơ sở dữ liệu (tóm tắt schema)
Các bảng/chính thể nổi bật (trích từ `prisma/schema.prisma`):
- `User`, `Session`, `PasswordReset`
- `Classroom`, `ClassroomStudent`, `ClassroomCourse`
- `Course`, `Lesson`
- `Assignment`, `Question`, `Option`, `AssignmentAttempt`, `ExamEvent`
- `AssignmentSubmission`
- `Submission`, `SubmissionFile` (file-based)
- `Announcement`, `AnnouncementComment`, `AnnouncementAttachment`
- `Conversation`, `ConversationParticipant`, `Message`, `ChatAttachment`
- `Organization`, `OrganizationMember`
- `AuditLog`
- `SystemSetting` (vd: disabled users)
- `ParentStudent`, `ParentStudentInvitation`, `ParentStudentLinkRequest`

Ghi chú:
- Module **Notifications** hiện có endpoint API để UI hoạt động, tuy nhiên theo code hiện tại đang trả danh sách rỗng và một số route còn `Not implemented` (MVP).

## 9. Các API chính (điểm danh theo nhóm)
> Ghi chú: API được tổ chức theo thư mục trong `src/app/api/`.

### 9.1. Auth
- `/api/auth/[...nextauth]`: endpoint NextAuth.

### 9.2. Users
- `/api/users/...`: profile, role, password, CRUD cơ bản.

### 9.3. Classrooms
- `/api/classrooms`: list/create.
- `/api/classrooms/join`: join lớp (theo code).
- `/api/classrooms/[id]/...`: các thao tác theo lớp.

### 9.4. Assignments
- `/api/assignments`: list/create.
- `/api/assignments/[id]/...`: chi tiết, submissions, file-submissions (phục vụ teacher review).

### 9.5. Submissions (file-based)
- `/api/submissions`: GET/POST/PUT theo assignmentId.
- `/api/submissions/[submissionId]/files`: signed URLs download.
- `/api/submissions/signed-url`, `/api/submissions/upload`: hỗ trợ upload workflow.

### 9.6. Chat
- `/api/chat/conversations`: tạo/list conversation.
- `/api/chat/messages`: list/send message.
- `/api/chat/unread-total`, `/api/chat/read`, `/api/chat/search`.

### 9.7. Notifications
- `GET /api/notifications`: hiện trả `data: []`, `unread: 0` để UI không lỗi.
- `GET /api/notifications/[id]`: hiện trả `501 Not implemented`.

### 9.8. Parent / Student / Teacher scopes
- `/api/parent/...`
- `/api/students/...`
- `/api/teachers/...`

## 10. Thiết lập môi trường & chạy dự án
### 10.1. Cài đặt
```bash
npm install
```

### 10.2. Chạy dev
```bash
npm run dev
```
Truy cập: `http://localhost:3000`

### 10.3. Biến môi trường (tham khảo theo code)
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Supabase (file submissions):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE`
  - `SUPABASE_STORAGE_BUCKET` hoặc `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` (mặc định `lms-submissions`)

### 10.4. Migration/Seed
- Prisma migrate: `npx prisma migrate deploy` (hoặc `prisma migrate dev`).
- Seed (nếu dùng): cấu hình trong `package.json` → `node prisma/seed.js`.

## 11. Gợi ý nội dung “bài báo cáo” (để bạn tùy biến)
Bạn có thể bổ sung thêm các mục sau (nếu dùng cho luận văn/đồ án):
- **Bài toán**: vấn đề quản lý lớp học/bài tập ở THCS.
- **Mục tiêu chất lượng**: bảo mật, dễ dùng, hiệu năng, khả năng mở rộng theo tổ chức.
- **Sơ đồ use-case** theo 3 vai trò (Teacher/Student/Parent).
- **Sơ đồ ERD** dựa trên Prisma schema.
- **Luồng nghiệp vụ minh họa**:
  - Teacher tạo lớp → tạo bài → gán vào lớp.
  - Student join lớp → xem bài → nộp bài file-based.
  - Teacher xem submissions → chấm/feedback.
  - Parent liên kết student → xem tiến độ.

## 12. Trạng thái hoàn thành & hướng phát triển
### 12.1. Điểm đã có
- Core LMS + phân quyền + dashboard theo vai trò.
- Assignment Essay/Quiz, có mô hình question/option.
- Nộp bài bằng file qua Supabase Storage.
- Chat và announcement.
- Phân hệ **Admin Portal** với role `ADMIN`, dashboard thống kê, quản lý user (ban/unban, tạo giáo viên, bulk import CSV) và xem Audit Logs.
- Phân hệ **Admin Classroom Management**: trang danh sách + trang chi tiết lớp, chỉnh sửa lớp, đổi giáo viên, lưu trữ/khôi phục, import CSV học sinh có fullname, export CSV, xoá học sinh (single/bulk) và quy tắc khoá thao tác khi lớp lưu trữ.
- Tính năng **AI Quiz Generator** từ nội dung bài học (paste text/file) sử dụng Google Gemini API.
- Tính năng **AI Tutor (RAG)** cho học sinh theo từng bài học, với UI tab Tutor trong trang lesson và backend sử dụng pgvector + Google Gemini để trả lời dựa trên nội dung đã index.

### 12.2. Hướng phát triển gợi ý
- Chuẩn hóa format lỗi API (đồng nhất `error/message/details`).
- Bổ sung rate limiting cho API nhạy cảm.
- Hoàn thiện báo cáo/analytics theo lớp/khóa học.
- Tăng test coverage (unit/integration) cho API và business rules.
