# THIẾT KẾ KỸ THUẬT: PHÂN HỆ QUẢN TRỊ (ADMIN PORTAL)

**Dự án:** Secondary LMS System  

---

## 1. Tổng quan phân hệ
Admin Portal là khu vực dành riêng cho quản trị viên hệ thống. Khác với Dashboard của Giáo viên (tập trung vào lớp học) hay Học sinh (tập trung vào bài tập), Admin Portal tập trung vào **Vận hành, Giám sát và Cấu hình**.

**Nguyên tắc thiết kế:**
1.  **Quyền lực tập trung:** Admin có quyền can thiệp vào user data nhưng hạn chế can thiệp vào nội dung chuyên môn (bài giảng) trừ khi cần thiết.
2.  **Tính minh bạch (Auditability):** Mọi hành động nhạy cảm của Admin phải được ghi log.
3.  **Giao diện tách biệt:** Sử dụng Layout riêng để tránh nhầm lẫn với các vai trò khác.

### 1.1. Trạng thái triển khai hiện tại

- Đã bổ sung role `ADMIN` vào `enum UserRole` trong Prisma và đưa vào JWT/session của NextAuth.
- `middleware.ts` đã bảo vệ đầy đủ:
  - Chỉ `ADMIN` được truy cập `/dashboard/admin/*` và `/api/admin/*`.
  - Chuẩn hoá redirect `/dashboard/admin` → `/dashboard/admin/dashboard`.
- **Admin Layout** (`src/app/dashboard/admin/layout.tsx`) đã tách sidebar riêng với chế độ quản trị.
- Đã triển khai các màn hình và API chính cho Admin:
  - `/dashboard/admin/dashboard` + `GET /api/admin/stats`: thống kê tổng quan users/lớp/bài tập/tổ chức và số tài khoản bị khoá.
  - `/dashboard/admin/users` + `GET /api/admin/users`: danh sách user với phân trang, lọc theo vai trò, tìm kiếm.
  - `POST /api/admin/users/[id]/status`: Ban/Unban user qua `SystemSetting.disabled_users` và ghi `AuditLog`.
  - `POST /api/admin/users`: tạo nhanh giáo viên (Create Teacher) với họ tên, email, mật khẩu (**UI dạng dialog**).
  - `POST /api/admin/users/bulk`: tạo **hàng loạt** giáo viên từ danh sách text hoặc file CSV (**UI dạng dialog**, hỗ trợ kéo‑thả).
  - `/dashboard/admin/classrooms` + `GET /api/admin/classrooms`: quản lý lớp học toàn hệ thống (lọc trạng thái, tìm kiếm, phân trang).
  - `/dashboard/admin/classrooms/[id]` + `GET /api/admin/classrooms/[id]`: trang chi tiết lớp (overview + actions) và quản lý học sinh.
  - `PATCH /api/admin/classrooms/[id]`: chỉnh sửa lớp (name/code/maxStudents) + validate + check code unique.
  - `POST /api/admin/classrooms/[id]/teacher`: đổi giáo viên (admin-only) + audit.
  - `POST /api/admin/classrooms/[id]/students/bulk`: thêm học sinh hàng loạt (text/CSV `fullname,email`), tuỳ chọn tự tạo tài khoản nếu email chưa có.
  - `GET /api/admin/classrooms/[id]/students/export`: export CSV danh sách học sinh.
  - `DELETE /api/admin/classrooms/[id]/students/[studentId]`: xoá học sinh khỏi lớp (có guard lớp lưu trữ).
  - `POST /api/admin/classrooms/[id]/status`: lưu trữ/khôi phục lớp (archive/unarchive) + audit.
  - Quy tắc lớp lưu trữ: khoá thao tác thay đổi (UI disable + API guard) và chỉ cho xem/export/khôi phục.
  - Bulk remove học sinh (multi-select) ở trang chi tiết lớp.
  - Khi thêm học sinh hàng loạt có dòng không thêm được: hiển thị dialog liệt kê email + lý do.
  - `/dashboard/admin/audit-logs` + `GET /api/admin/audit-logs`: xem nhật ký hệ thống với phân trang theo cursor.

-----

## 2. Kiến trúc dữ liệu (Database Schema Update)
Cần bổ sung các Model sau vào `prisma/schema.prisma` để phục vụ chức năng Admin.

### 2.1. Audit Log (Nhật ký hệ thống)
Lưu vết các tác vụ quan trọng (Xóa user, đổi điểm, thay đổi cấu hình).

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  action      String   // VD: "USER_BAN", "CLASS_DELETE", "SYSTEM_CONFIG_UPDATE"
  entityType  String   // VD: "User", "Classroom", "Assignment"
  entityId    String?  // ID của đối tượng bị tác động
  actorId     String   // User ID của người thực hiện (Admin/Teacher)
  metadata    Json?    // Lưu chi tiết thay đổi (VD: { oldRole: "STUDENT", newRole: "TEACHER" })
  createdAt   DateTime @default(now())
  ipAddress   String?  // (Optional) IP người thực hiện

  actor       User     @relation(fields: [actorId], references: [id])
  @@index([actorId])
  @@index([createdAt])
}
```

### 2.2. System Settings (Cấu hình động)

Giúp Admin thay đổi tham số hệ thống mà không cần deploy lại code.

```prisma
model SystemSetting {
  key         String   @id // VD: "CURRENT_TERM", "MAINTENANCE_MODE", "ALLOW_REGISTRATION"
  value       String   // Giá trị cấu hình
  description String?
  updatedAt   DateTime @updatedAt
}
```

-----

## 3\. Sơ đồ chức năng (Site Map)

Cấu trúc URL: `/dashboard/admin/*`

1.  **Dashboard (Overview):**
      * Thống kê tổng quan (Total Users, Active Classes, Storage usage).
      * Biểu đồ truy cập (nếu có data).
2.  **User Management (`/users`):**
      * Danh sách User (Phân trang, Filter theo Role).
      * Create Teacher (Form tạo nhanh giáo viên).
      * User Detail (Xem profile, lịch sử hoạt động, Action: Reset Password / Ban).
3.  **Classroom Management (`/classrooms`):**
      * Danh sách toàn bộ lớp học trong hệ thống.
      * Điều hướng sang trang chi tiết lớp `/dashboard/admin/classrooms/[id]`.
      * Action: Archive lớp (Lưu trữ) / Unarchive (Khôi phục).
      * (Tuỳ chọn mở rộng) Force Delete (Xóa lớp vi phạm).
4.  **System Settings (`/settings`):**
      * Bật/Tắt chế độ bảo trì.
      * Cấu hình thông báo toàn hệ thống (Global Announcement).
5.  **Audit Logs (`/audit-logs`):**
      * Xem lịch sử tác động hệ thống.

-----

## 4\. Luồng hoạt động chi tiết (Workflows)

### 4.1. Luồng Xác thực & Bảo mật (Middleware Security)

Đảm bảo chỉ Admin mới vào được khu vực này.

1.  **Request:** User truy cập `/dashboard/admin/*`.
2.  **Middleware Check (`middleware.ts`):**
      * Lấy Session từ NextAuth.
      * Kiểm tra: `if (!session || session.user.role !== 'ADMIN')`.
3.  **Decision:**
      * Nếu sai: Redirect về `/403-forbidden` hoặc `/dashboard`.
      * Nếu đúng: Cho phép `NextResponse.next()`.

### 4.2. Luồng Quản lý User (Ví dụ: Khóa tài khoản)

Dùng Server Actions hoặc API Route.

1.  **UI:** Admin click nút "Ban User" trên dòng của học sinh Nguyễn Văn A.
2.  **Confirm Modal:** Hiện popup yêu cầu nhập lý do khóa.
3.  **Server Action:**
      * `UPDATE "User" SET active = false WHERE id = ...`
      * `INSERT INTO "AuditLog" (action: "USER_BAN", actorId: AdminID, metadata: { reason: "..." })`
4.  **Response:** Toast thông báo thành công, UI cập nhật trạng thái user sang "Inactive" (Màu xám/đỏ).

### 4.3. Luồng Tạo Giáo viên Mới

Vì Giáo viên thường được nhà trường cấp tài khoản chứ không tự đăng ký.

1.  **UI:** Form "Create Teacher" (Họ tên, Email, Mật khẩu mặc định).
2.  **Validation:** Check email đã tồn tại chưa.
3.  **Processing:**
      * Hash mật khẩu mặc định.
      * `Create User` với `role = TEACHER`.
      * `Create TeacherProfile` (nếu tách bảng).
4.  **Notification:** (Tùy chọn) Gửi email chứa thông tin đăng nhập cho giáo viên.

-----

## 5\. Thiết kế Giao diện (UI/UX Concepts)

### 5.1. Admin Layout (`src/app/dashboard/admin/layout.tsx`)

Sử dụng Sidebar riêng biệt để Admin luôn ý thức được mình đang ở mode quản trị.

  * **Sidebar:** Màu sắc đậm hơn (VD: Slate-900). Logo có thêm chữ "ADMIN".
  * **Navigation Items:** Overview, Users, Classes, Audit Logs, Settings.
  * **User Menu:** Có nút "Exit Admin View" (về trang chủ) hoặc "Logout".

### 5.2. Các màn hình chính

  * **Data Tables:** Sử dụng thư viện `@tanstack/react-table` kết hợp Shadcn UI Table.
      * Cột: Avatar, Name, Email, Role, Status (Badge xanh/đỏ), Actions (Dropdown menu).
      * Filter: Input search, Dropdown chọn Role.
  * **Detail View:** Khi bấm vào 1 User, hiện ra trang chi tiết dạng Card.
      * Card 1: Thông tin cá nhân.
      * Card 2: Danh sách các lớp đang tham gia.
      * Card 3: Audit Log (Lịch sử hoạt động của user này).

-----

## 6\. API Endpoints (Gợi ý)

Các API này nên được đặt trong `src/app/api/admin/...` để dễ quản lý middleware.

| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/admin/stats` | Lấy số liệu thống kê dashboard. |
| `GET` | `/api/admin/users` | Lấy danh sách user (có phân trang). |
| `POST` | `/api/admin/users` | Tạo user mới (Admin create). |
| `PATCH`| `/api/admin/users/[id]/status` | Ban/Unban user. |
| `GET` | `/api/admin/audit-logs` | Lấy dữ liệu nhật ký hệ thống. |

-----

## 7\. Các bước triển khai (Implementation Steps)

1.  **Database:** Chạy `npx prisma migrate` để thêm bảng `AuditLog` và `SystemSetting`.
2.  **Middleware:** Cập nhật file `middleware.ts` để bảo vệ route `/dashboard/admin`.
3.  **Layout:** Build `AdminLayout` và `AdminSidebar`.
4.  **Feature 1 (Users):** Xây dựng trang danh sách User và chức năng Ban/Unban trước (dễ nhất).
5.  **Feature 2 (Stats):** Viết query đếm số lượng user/class hiển thị lên Dashboard.
6.  **Feature 3 (Logs):** Viết helper function `logAudit()` và gắn vào các server action quan trọng.

<!-- end list -->

```