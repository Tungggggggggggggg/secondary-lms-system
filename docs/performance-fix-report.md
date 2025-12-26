# Báo cáo tối ưu hiệu năng (Performance Fix Report)

Ngày: 2025-12-26

Tài liệu này dùng để:

- Ghi lại những tối ưu hiệu năng **đã được triển khai trong codebase**.
- Chỉ rõ những việc **bắt buộc phải làm khi triển khai** để tối ưu có hiệu lực trên DB thật.
- Là checklist để người sau tiếp tục **tìm và xử lý nút nghẽn mới**.

## 1) Tóm tắt điều tra (triệu chứng & nguyên nhân)

### 1.1. Triệu chứng

- **Latency cao** dù HTTP `200` ở các endpoint bị gọi dồn dập:
  - `/api/system/settings`
  - `/api/notifications`
  - `/api/chat/unread-total`, `/api/chat/conversations`, `/api/chat/messages`
  - `/api/teachers/dashboard/*`

### 1.2. Nguyên nhân gốc rễ (đã xác định)

- **HTTP waterfall trong middleware**: middleware gọi nội bộ `/api/system/settings` trên nhiều request dashboard.
- **Auth tạo DB round-trip thừa**: `getAuthenticatedUser()` query DB cho mọi request.
- **DB concurrency bị bóp nghẹt** do `DATABASE_URL` có `connection_limit=1`.
- **Patterns gây chậm dễ tái phát**:
  - Client `fetch({ cache: "no-store" })` / SWR `refreshInterval` quá dày.
  - Ghi notifications theo loop N lần (đã refactor phần lớn, nhưng cần migrate để chạy DB mode hoàn chỉnh).

## 2) Việc đã hoàn thành (đã có trong codebase)

### 2.1. Backend (API & Middleware)

- **Gỡ HTTP waterfall** khỏi middleware.
  - File: `src/middleware.ts`.
- **Tối ưu auth**: `getAuthenticatedUser()` decode JWT (`getToken`) + request-scoped cache; tránh query `user` trên mọi request.
  - File: `src/lib/api-utils.ts`.
- **Cache-Control ngắn hạn** cho endpoint hay bị gọi liên tục để giảm request storm:
  - `/api/system/settings`, `/api/notifications`, `/api/chat/unread-total`, `/api/teachers/dashboard/*`.
- **Giảm round-trip thừa** khi thêm assignment vào classroom:
  - Bỏ query “check tồn tại”, dựa vào unique constraint và handle `P2002`.
  - File: `src/app/api/classrooms/[id]/assignments/route.ts`.
- **Tối ưu tạo lesson**: lấy `order` bằng `findFirst(order desc)` thay vì `aggregate(_max)`.
  - Files:
    - `src/app/api/teachers/courses/[courseId]/lessons/route.ts`
    - `src/app/api/teachers/courses/[courseId]/lessons/file/route.ts`

### 2.2. Notifications (giảm N writes + đúng unread)

- `notificationRepo` đã hỗ trợ:
  - `addMany()` để insert batch.
  - `countUnread()` để đếm unread trực tiếp ở DB.
  - `legacy_fallback` logging để phát hiện môi trường chưa migrate.
  - File: `src/lib/repositories/notification-repo.ts`.
- API `/api/notifications`:
  - Trả `unread` bằng `countUnread()` (đúng kể cả khi chỉ trả 50 items).
  - File: `src/app/api/notifications/route.ts`.
- Các nơi gửi hàng loạt notifications đã chuyển sang batch `addMany()`:
  - `classrooms/[id]/announcements`
  - `classrooms/[id]/assignments`
  - `assignments/[id]/submissions/[submissionId]` (chấm bài)
  - `assignments/[id]/file-grade` (chấm bài nộp file)
  - `chat/messages` (teacher nhắn → notify phụ huynh)
- UI `NotificationBell` dùng `unread` từ API (không phụ thuộc list 50 items).
  - File: `src/components/shared/NotificationBell.tsx`.

### 2.3. Database / Prisma (đã thêm migrations trong repo)

- **notifications** (chuyển notifications từ JSON blob sang table + backfill):
  - `prisma/migrations/20251226191000_add_notifications_table/migration.sql`
- **lesson_attachments** (bổ sung bảng còn thiếu để tránh 500 khi upload/tải đính kèm):
  - `prisma/migrations/20251226202000_add_lesson_attachments_table/migration.sql`
- **chat unread indexes**:
  - `prisma/migrations/20251226203000_add_chat_unread_indexes/migration.sql`
- **grades latest submission** + index hỗ trợ `DISTINCT ON`:
  - `prisma/migrations/20251226210000_add_assignment_submissions_latest_indexes/migration.sql`
- **lessons(courseId, order)** index:
  - `prisma/migrations/20251226211000_add_lessons_course_order_index/migration.sql`

### 2.4. Reports / Chat / Grades (giảm CPU, payload, round-trip)

- Reports:
  - `reportsRepo.growth()` chuyển sang SQL `GROUP BY`.
  - File: `src/lib/repositories/reports-repo.ts`.
- Chat repository:
  - Giảm payload (include → select), giảm round-trip ở `searchMessages()`.
  - File: `src/lib/repositories/chat.ts`.
- Grades:
  - Lấy “latest submission” bằng Postgres `DISTINCT ON` (tránh load nhiều attempt rồi dedupe bằng JS).
  - Files:
    - `src/app/api/teachers/classrooms/[id]/grades/route.ts`
    - `src/app/api/teachers/classrooms/[id]/students/[studentId]/grades/route.ts`
    - `src/app/api/students/grades/route.ts`

### 2.5. Frontend (giảm request storm ở các điểm nhạy)

- `/api/system/settings`: tăng `dedupingInterval`, giữ `keepPreviousData`.
  - Files: `src/components/shared/SystemStatusGate.tsx`, `src/app/maintenance/page.tsx`.
- Dashboard fetcher: bỏ ép `cache: "no-store"` ở hook dashboard teacher.
  - File: `src/hooks/use-teacher-dashboard.ts`.

### 2.6. Quality gates

- `npm run lint`: PASS
- `npm run build`: PASS
- `npm test` (vitest): PASS

## 3) Việc bắt buộc phải làm khi triển khai (để tối ưu có hiệu lực)

### 3.1. Cấu hình DB connection / pooling

- **Không dùng** `connection_limit=1`.
- Khuyến nghị local dev: `connection_limit=5..10`.
- Khuyến nghị production:
  - Dùng pooler (PgBouncer/Supabase pooler) và đặt pool size phù hợp tải thực tế.

### 3.2. Áp dụng Prisma migrations + generate

Chạy tại project root:

- Dev/local:
  - `npx prisma migrate dev`
  - `npx prisma generate`
- Production:
  - `npx prisma migrate deploy`
  - `npx prisma generate`

Sau đó restart server để Prisma/Next nhận schema mới.

### 3.3. Checklist verify sau migrate

- DB có các bảng/index mới:
  - `notifications`
  - `lesson_attachments`
  - index `lessons(courseId, order)`
- Log **không còn** xuất hiện nhiều `[notificationRepo] legacy_fallback`.
- Các màn hình upload/tải lesson attachments hoạt động ổn định (không 500).

## 4) Việc đang dang dở / khuyến nghị làm tiếp

### 4.1. Frontend data fetching (ưu tiên cao)

Hiện codebase còn nhiều chỗ dùng `fetch({ cache: "no-store" })` hoặc SWR refresh quá dày.

Khuyến nghị:

- Rà soát và giảm `no-store` ở các trang/hook gọi liên tục, ưu tiên:
  - `src/hooks/use-announcements.ts`
  - `src/hooks/use-teacher-submissions.ts`
  - `src/hooks/use-admin-stats.ts`
  - `src/hooks/use-chat.ts`
  - các trang admin trong `src/app/dashboard/admin/*`
- Chuẩn hoá fetcher dùng chung (ưu tiên dùng `src/lib/fetcher.ts`) để thống nhất parse error + không lặp code.
- Tận dụng `Cache-Control` phía server thay vì ép `no-store` phía client.

### 4.2. Chat polling (đo lường rồi tinh chỉnh)

- `use-chat.ts` đang refresh khá thường xuyên (`8s`, `15s`, ...). Với DB latency cao có thể tạo tải nền lớn.
- Khuyến nghị:
  - Tăng `dedupingInterval`, giảm `refreshInterval`, hoặc chỉ refresh khi tab focus.
  - Nếu cần realtime: cân nhắc WebSocket / SSE thay vì polling.
- Rà soát thêm index cần thiết (nếu chưa có): `messages(conversationId, createdAt)`.

### 4.3. Notifications (hoàn thiện sau migrate)

- Khi đã migrate DB:
  - Theo dõi log `legacy_fallback` để đảm bảo không còn fallback.
  - Xác định chính sách retention (giới hạn số notification lưu theo user) và pagination.

### 4.4. Observability / đo lường

- Bật/thu thập số liệu:
  - Prisma query log (slow query warning).
  - Postgres `pg_stat_statements` (nếu môi trường cho phép).
- Theo dõi p95/p99 cho các endpoint dashboard chính.

## 5) Checklist kiểm chứng (sau khi áp dụng)

### 5.1. Quality gates

- `npm run lint`
- `npm run build`
- `npm test`

### 5.2. Manual check (UI + Network)

- Điều hướng dashboard teacher/student:
  - Không còn middleware gọi nội bộ `/api/system/settings`.
  - Badge notifications hiển thị đúng `unread`.
  - Upload/tải `lesson_attachments` không còn 500.
- Chrome DevTools → Network:
  - Kiểm tra có request storm không (nhiều request trùng key trong vài giây).
  - So sánh TTFB trước/sau.

### 5.3. Log/DB check

- Xem log các cảnh báo:
  - `[SLOW API] ...`
  - `[notificationRepo] legacy_fallback ...` (mục tiêu: gần 0 sau migrate)

## 6) Checklist rà soát nút nghẽn tiếp theo (cho người tiếp quản)

- **DB / Prisma**
  - Đảm bảo pool size phù hợp; tránh serialize queries.
  - Rà soát N+1 (`include`/`select`), payload lớn, thiếu index.
  - Dùng `EXPLAIN (ANALYZE, BUFFERS)` cho query p95 cao.
- **API**
  - Endpoint nào `take` quá lớn (vd `take: 500`) → cân nhắc pagination.
  - Batch write khi có loop theo user/classroom.
- **Frontend**
  - Tránh `cache: "no-store"` mặc định.
  - Tránh SWR `refreshInterval` dày ở nhiều component cùng lúc.
  - Tránh mount nhiều component cùng gọi 1 endpoint nhưng khác key.

