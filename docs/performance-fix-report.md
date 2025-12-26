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

- Checklist triển khai (đánh dấu sau mỗi lần refactor):
  - [x] Chuẩn hoá fetcher dùng chung: `src/lib/fetcher.ts`
  - [x] `src/hooks/use-announcements.ts`
  - [x] `src/hooks/use-teacher-submissions.ts`
  - [x] `src/hooks/use-admin-stats.ts`
  - [x] `src/hooks/use-chat.ts`
  - [ ] các trang admin trong `src/app/dashboard/admin/*`
    - [x] `src/app/dashboard/admin/users/page.tsx`
    - [x] `src/app/dashboard/admin/users/[id]/page.tsx`
    - [x] `src/app/dashboard/admin/classrooms/page.tsx`
    - [x] `src/app/dashboard/admin/classrooms/[id]/page.tsx`
    - [x] `src/app/dashboard/admin/audit-logs/page.tsx`
    - [x] `src/app/dashboard/admin/settings/page.tsx`
    - [x] `src/app/dashboard/admin/organizations/page.tsx`
    - [x] `src/app/dashboard/admin/organizations/[id]/page.tsx`

- Tận dụng `Cache-Control` phía server thay vì ép `no-store` phía client.

### 4.2. Chat polling (đo lường rồi tinh chỉnh)

-[x] `use-chat.ts` đang refresh khá thường xuyên (`8s`, `15s`, ...). Với DB latency cao có thể tạo tải nền lớn.
-[x] Khuyến nghị:
  -[x] Tăng `dedupingInterval`, giảm `refreshInterval`, hoặc chỉ refresh khi tab focus.
  -[x] Nếu cần realtime: cân nhắc WebSocket / SSE thay vì polling.
-[x] Rà soát thêm index cần thiết (nếu chưa có): `messages(conversationId, createdAt)`.

- Đã triển khai (2025-12-27):
  - `useConversations()`: `refreshInterval = 30s`, `dedupingInterval = 45s`, `revalidateOnFocus = true`, tắt `refreshWhenHidden` / `refreshWhenOffline`.
  - `useMessages()`: `refreshInterval = 10s`, `dedupingInterval = 15s`, `revalidateOnFocus = true`, tắt `refreshWhenHidden` / `refreshWhenOffline`.
  - `useUnreadTotal()`: giữ `refreshInterval = 60s`, `dedupingInterval = 45s`, tắt `refreshWhenHidden` / `refreshWhenOffline`.

### 4.3. Notifications (hoàn thiện sau migrate)

- Khi đã migrate DB:
  -[x] Theo dõi log `legacy_fallback` để đảm bảo không còn fallback.
  -[x] Xác định chính sách retention (giới hạn số notification lưu theo user) và pagination.
  -[x] Đã triển khai (2025-12-27):
    - `notificationRepo` (DB mode) tự động trim tối đa ~500 notifications gần nhất trên mỗi user bằng `trimUserNotifications()` sau khi `add()`/`addMany()` (legacy JSON vẫn giữ ngưỡng ~200). 
    - API `/api/notifications` dùng `notificationRepo.list(user.id, { limit: 50 })` để trả về tối đa 50 notification mới nhất + `countUnread()` để tính unread chính xác.

### 4.4. Observability / đo lường

- Bật/thu thập số liệu:
  -[x] Prisma query log (slow query warning).
  -[x] Postgres `pg_stat_statements` (nếu môi trường cho phép).
-[x] Theo dõi p95/p99 cho các endpoint dashboard chính.
  - Đã triển khai (2025-12-27):
    - `src/lib/prisma.ts`: bật Prisma log ở chế độ phát triển với event `query` và log `[SLOW QUERY]` cho các query > 1000ms.
    - `src/lib/performance-monitor.ts`: lưu trữ tối đa 1000 metrics gần nhất, log `[SLOW_API]` / `[VERY_SLOW_API]`, và tính thêm `p50` / `p95` / `p99` cho thời gian phản hồi.
    - Bọc một số endpoint quan trọng bằng `withPerformanceTracking()` để tự động ghi metric:
      - `GET /api/assignments` (teacher list assignments)
      - `POST /api/ai/tutor/chat`
      - `POST /api/ai/anti-cheat/summary`
      - `POST /api/exam-events`
      - `GET /api/teachers/dashboard/stats`

## 5) Checklist kiểm chứng (sau khi áp dụng)

### 5.1. Quality gates

- `npm run lint`
- `npm run build`
- `npm test`

### 5.2. Manual check (UI + Network)

- Luồng 1 – Dashboard teacher:
  - [x ] Đăng nhập bằng tài khoản **teacher**, mở dashboard chính.
  - [x ] Kiểm tra các thẻ thống kê (stats / performance / tasks / goals / activities) hiển thị bình thường, không lỗi 500.
  - [ x] Mở Chrome DevTools → tab **Network**, filter `teachers/dashboard`:
    - [ x] Mỗi endpoint `/api/teachers/dashboard/*` chỉ được gọi **1 lần** khi load trang (không bị gọi lặp nhiều lần do nhiều component trùng key).
    - [x ] Các response có header `Cache-Control` đúng như cấu hình (`private, max-age=10, stale-while-revalidate=50` hoặc tương đương).

- Luồng 2 – Notifications:
  - [ x] Thực hiện 1–2 hành động sinh notification (gửi announcement, chấm bài, gửi tin nhắn teacher → parent).
  - [x ] Mở UI có `NotificationBell`:
    - [x ] Badge `unread` hiển thị đúng số chưa đọc (so sánh với response `/api/notifications` → field `unread`).
    - [x ] Mở panel, bấm **"Đánh dấu đã đọc tất cả"** (hoặc tương đương):
      - [ x] Request `POST /api/notifications/mark-all-read` thành công.
      - [ x] Badge `unread` về 0 sau khi panel refresh.
    - [ x] Click vào 1 notification:
      - [x ] Gửi `PATCH /api/notifications/:id` đánh dấu đã đọc.
      - [x ] Điều hướng tới đúng `actionUrl` (nếu có).

- Luồng 3 – Lesson attachments:
  - [ ] Từ role teacher, upload 1 file đính kèm cho lesson (lesson attachments) từ UI.
  - [ ] Reload trang, bấm tải lại file vừa upload:
    - [ ] Không còn lỗi 500.
    - [ ] File tải về mở được, nội dung đúng.

- Chrome DevTools → Network (polling / request storm):
  - [ x] Mở đồng thời dashboard teacher + 1–2 trang chat, để yên 1–2 phút.
  - [x ] Trong tab Network, filter lần lượt theo `/api/chat/*`, `/api/notifications`, `/api/system/settings`:
    - [x ] Không xuất hiện nhiều request trùng URL sát nhau trong vài giây (không có request storm).
    - [x ] Khoảng cách giữa các lần poll khớp với cấu hình `refreshInterval` mới (ví dụ: 10s cho messages, 30s cho conversations, 60s cho unread total).
 

### 5.3. Log/DB check

- Xem log các cảnh báo:
  - `[SLOW API] ...`
  - `[notificationRepo] legacy_fallback ...` (mục tiêu: gần 0 sau migrate)

## 6) Checklist rà soát nút nghẽn tiếp theo (cho người tiếp quản)

- **DB / Prisma**
  - [ ] Kiểm tra cấu hình `DATABASE_URL` trên từng môi trường:
    - [ ] Có dùng pooler (PgBouncer/Supabase pooler) nếu hạ tầng cho phép.
    - [ ] Pool size/phân bổ connection phù hợp tải thực tế, không để `connection_limit=1`.
  - [ ] Dựa trên log `[SLOW QUERY]` / APM, liệt kê top 5–10 query có **p95/p99 cao nhất**.
  - Với từng query chậm:
    - [ ] Chạy `EXPLAIN (ANALYZE, BUFFERS)` trên DB thật hoặc staging dữ liệu tương đương.
    - [ ] Kiểm tra kế hoạch thực thi: có dùng index đúng không, có full scan/bloated index không.
    - [ ] Nếu thiếu index cho các cột trong `WHERE` / `JOIN` / `ORDER BY`, thiết kế thêm index (ưu tiên index tổng hợp phục vụ nhiều truy vấn).
    - [ ] Rà soát code Prisma tương ứng:
      - [ ] Giảm N+1 (chuyển từ nhiều query nhỏ sang 1 query với `IN` / `DISTINCT ON` / join phù hợp).
      - [ ] Dùng `select` thay vì `include` nếu chỉ cần một số trường.
      - [ ] Hạn chế load JSON/payload lớn nếu không dùng đến.

- **API**
  - [ ] Rà soát các endpoint trả về danh sách lớn:
    - [ ] Tìm trong code các chỗ `take: 500` / `take: 1000` / không giới hạn `take`.
    - [ ] Với mỗi endpoint dạng list, xác định **page size hợp lý** (ví dụ 20–100 tuỳ màn hình) và chuẩn hoá pagination (cursor/offset).
  - [ ] Tìm các chỗ ghi DB trong vòng lặp:
    - [ ] Nếu đang gọi `create`/`update` trong loop theo user/classroom, cân nhắc chuyển sang `createMany` / `updateMany` / batch `upsert` tương tự `notificationRepo.addMany()`.
    - [ ] Đảm bảo mọi thao tác batch đều bọc trong transaction nếu cần tính nhất quán.
  - [ ] Với những API hay được gọi nền (polling, dashboard widgets), đảm bảo:
    - [ ] Có `Cache-Control` hợp lý.
    - [ ] Logic SQL tối ưu, không filter/sort nặng trên dữ liệu đã load về JS.

- **Frontend**
  - [ ] Tìm toàn bộ `fetch({ cache: "no-store" })` và các chỗ ép `cache: "no-store"`:
    - [ ] Giải thích được lý do phải no-store (ví dụ: export file, dữ liệu cực realtime); nếu không, chuyển sang dùng fetcher mặc định + rely vào `Cache-Control` server.
  - [ ] Rà soát các hook dùng SWR:
    - [ ] Tìm `refreshInterval` < 10s hoặc nhiều hook khác nhau cùng poll → gộp lại / nới interval / chỉ poll khi tab focus.
    - [ ] Chuẩn hoá `dedupingInterval`, `revalidateOnFocus`, `refreshWhenHidden`, `refreshWhenOffline` tương tự `use-chat` để tránh request storm.
  - [ ] Kiểm tra những màn hình có nhiều component cùng gọi 1 endpoint:
    - [ ] Đảm bảo chúng dùng chung hook/fetcher với cùng key (để SWR/dedup hoạt động), tránh mỗi component gọi 1 key khác nhau.
    - [ ] Nếu cần nhiều view trên cùng dữ liệu, cân nhắc state chung ở parent hoặc context thay vì fetch lại.

