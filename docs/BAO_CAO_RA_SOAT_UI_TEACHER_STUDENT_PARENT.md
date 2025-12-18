# BÁO CÁO RÀ SOÁT UI/UX — TEACHER / STUDENT / PARENT

## 1) Mục tiêu
- Rà soát toàn bộ UI theo 3 role: **teacher / student / parent** (pages dưới `src/app/dashboard/*` và components dưới `src/components/*`).
- Xác định các điểm cần **tái tổ chức giao diện** (màu sắc, layout, spacing, component usage, a11y).
- Đề xuất kế hoạch triển khai theo mức ưu tiên (impact/risk).

## 2) Phạm vi đã kiểm tra
### 2.1. Entry points / Layout
- `src/components/layout/DashboardLayout.tsx`
- `src/components/layout/DashboardTopbar.tsx`
- `src/components/layout/Sidebar.tsx` (shell dùng chung theo role)
- `src/app/dashboard/teacher/layout.tsx`
- `src/app/dashboard/student/layout.tsx`
- `src/app/dashboard/parent/layout.tsx`
- Redirect pages:
  - `src/app/dashboard/teacher/page.tsx`
  - `src/app/dashboard/student/page.tsx`
  - `src/app/dashboard/parent/page.tsx`

### 2.2. Pages tiêu biểu
- Teacher:
  - `src/app/dashboard/teacher/dashboard/page.tsx`
  - `src/app/dashboard/teacher/classrooms/page.tsx`
  - `src/app/dashboard/teacher/assignments/page.tsx`
  - `src/app/dashboard/teacher/students/page.tsx`
  - `src/app/dashboard/teacher/courses/page.tsx`
- Student:
  - `src/app/dashboard/student/dashboard/page.tsx`
  - `src/app/dashboard/student/classes/page.tsx`
  - `src/app/dashboard/student/assignments/page.tsx`
  - `src/app/dashboard/student/grades/page.tsx`
  - `src/app/dashboard/student/assignments/[id]/page.tsx` (đọc một phần)
- Parent:
  - `src/app/dashboard/parent/dashboard/page.tsx`
  - `src/app/dashboard/parent/children/page.tsx`
  - `src/app/dashboard/parent/progress/page.tsx`
  - `src/app/dashboard/parent/teachers/page.tsx`

### 2.3. Shared components liên quan trực tiếp đến UI role
- `src/components/shared/PageHeader.tsx`
- `src/components/shared/EmptyState.tsx`
- `src/components/shared/StatsGrid.tsx`
- `src/components/shared/SectionCard.tsx`
- `src/components/shared/FilterBar.tsx`
- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/tabs.tsx`

## 3) Kết luận nhanh (Executive Summary)
### 3.1. Điểm tốt
- Đã có **RoleThemeProvider** (student/parent) và `Button` có cơ chế `color` theo role.
- `PageHeader` và `EmptyState` đã có **variant theo role**, tạo cảm giác phân biệt vai trò.
- Nhiều trang đã bắt đầu dùng primitives (`Card`, `Table`, `Input`, `Select`, `Dialog`) thay vì HTML thuần.
- `globals.css` đã có utility role-surface/card/accent (`teacher-*`, `student-*`, `parent-*`).

### 3.2. Vấn đề chính cần xử lý
- **Layout/Spacing không nhất quán**:
  - Student/Parent đang wrap `children` bằng `p-8 space-y-8` trong layout, Teacher thì nhiều page tự `p-8`.
  - Có trang dùng `max-w-6xl mx-auto`, có trang full width.
- **Màu sắc hardcode rất nhiều** (đặc biệt `bg-*-50`, `text-gray-*`, `border-gray-*`), trong khi đã có utility role (`teacher-*`, `student-*`, `parent-*`).
- **Component shared chưa “role-aware” đồng bộ**:
  - `SectionCard` đang mặc định “blue style” (teacher-ish), nhưng được dùng ở parent → lệch.
  - `StatsGrid` đang hardcode focus ring màu xanh lá (green) cho mọi role.
  - `Tabs` mặc định xám, các page phải override thủ công (dễ lệch).
- **A11y / keyboard**:
  - Nhiều nơi dùng `onClick` trên `div/article` + `role="button"` nhưng thiếu `onKeyDown` (Enter/Space) → không truy cập được bằng bàn phím.
- **Redirect pages không nhất quán theme**:
  - `student/page.tsx` và `parent/page.tsx` dùng background gradient khác dashboard, có ProtectedRoute lồng thêm (thừa) → gây flicker + không đồng bộ.

## 4) Đề xuất hướng thiết kế (không đụng Admin)
### 4.1. Mục tiêu UI thống nhất
- Một “Modern SaaS light” cho toàn dashboard.
- Accent theo role:
  - Teacher: **blue**
  - Student: **green**
  - Parent: **amber**

### 4.2. Quy tắc áp dụng
- **Ưu tiên dùng tokens / utility role (`teacher-*`, `student-*`, `parent-*`)** thay vì hardcode `bg-blue-50`, `text-gray-700`, ...
- Chuẩn hoá layout:
  - 1 container chuẩn cho hầu hết pages (trừ messages):
    - `max-w-6xl` hoặc `max-w-7xl` (chốt sau),
    - padding responsive theo 8pt grid.
- Overlay components: ưu tiên dùng primitives hiện có (`Dialog`, `DropdownMenu`, `Popover`).

## 5) Checklist triển khai (ưu tiên theo impact/risk)

### P0 — Shell & Consistency nền (Impact cao / Risk thấp)
- [ ] `src/components/layout/DashboardLayout.tsx`
  - [ ] Dùng background theo role surface (`teacher-surface`, `student-surface`, `parent-surface`) thay vì `bg-gray-50` chung.
  - [ ] Chuẩn bị điểm đặt “container wrapper” để loại bỏ `p-8` rải rác (triển khai dần).
- [ ] `src/components/layout/DashboardTopbar.tsx`
  - [ ] Topbar dùng nền + border nhất quán, ring theo role.
- [ ] `src/app/dashboard/teacher/layout.tsx`
  - [ ] Bọc `RoleThemeProvider color="blue"` để đồng bộ Button/controls.
- [ ] `src/app/dashboard/student/page.tsx`, `src/app/dashboard/parent/page.tsx`
  - [ ] Loại UI redirect gradient lệch theme; tránh ProtectedRoute lồng thừa.

### P1 — Shared components “role-aware” (Impact cao / Risk trung bình)
- [ ] `src/components/shared/SectionCard.tsx`
  - [ ] Thêm `variant` theo role để bỏ style hardcode blue.
- [ ] `src/components/shared/StatsGrid.tsx`
  - [ ] Cho phép truyền `accent`/`variant` để focus ring không bị cố định green.
- [ ] `src/components/ui/tabs.tsx`
  - [ ] (Tuỳ chọn) hỗ trợ `variant` theo role hoặc token-based để giảm override lặp.
- [ ] `src/components/ui/breadcrumb.tsx`
  - [ ] Giảm hardcode `text-gray-*` sang token/role accent.

### P2 — Page refactor theo role (Impact cao / Risk trung bình-cao)
#### Teacher
- [ ] `src/app/dashboard/teacher/courses/page.tsx`
  - [ ] Đổi header thủ công sang `PageHeader` + `Breadcrumb`.
  - [ ] Chuẩn hoá `Input/Select` dùng `color="blue"` đồng bộ.
- [ ] `src/app/dashboard/teacher/classrooms/page.tsx`
  - [ ] Bỏ `ProtectedRoute` thừa (đã có ở layout).
  - [ ] Chuẩn container giống các page khác.
- [ ] `src/app/dashboard/teacher/students/page.tsx`
  - [ ] Thay các `button` hardcode sang `Button`.
  - [ ] Chuẩn hoá view toggle (a11y) + colors.
- [ ] `src/components/teacher/exam/ExamMonitoringDashboard.tsx`
  - [ ] Hiện là code “prototype” hardcode màu, console.log, mock data.
  - [ ] Cần quyết định: sản phẩm thật hay demo. Nếu sản phẩm thật → refactor theo primitives + token + remove mock.

#### Student
- [ ] `src/app/dashboard/student/classes/page.tsx`
  - [ ] Skeleton đang dùng `bg-gray-200`; chuyển sang `Skeleton` component để thống nhất.
- [ ] `src/app/dashboard/student/grades/page.tsx`
  - [ ] Tách badge/status thành component tái dùng (giảm hardcode class string).
- [ ] `src/app/dashboard/student/assignments/[id]/page.tsx`
  - [ ] Có nhiều block `bg-white rounded-xl shadow` rải rác; cần chuẩn hoá Card/Section.

#### Parent
- [ ] `src/app/dashboard/parent/progress/page.tsx`
  - [ ] Thay `<select>` thuần bằng `Select` component để đồng bộ.
  - [ ] Giảm hardcode `text-gray-*` sang variant.
- [ ] `src/app/dashboard/parent/children/page.tsx`
  - [ ] Chuẩn loading/error state theo `Skeleton/EmptyState` (hiện đang mixed).

### P3 — A11y & QA (Impact cao / Risk thấp)
- [ ] Tất cả interactive “card click” (`article/div` + `onClick`) phải hỗ trợ keyboard:
  - Enter/Space trigger.
  - Focus-visible rõ.
- [ ] Kiểm tra:
  - Responsive (mobile/tablet/desktop)
  - Tab order, Esc, focus trap (Dialog)
  - Loading/empty/error consistency

## 6) Hạng mục mình sẽ triển khai ngay (đợt 1)
- P0:
  - Đồng bộ background shell theo role.
  - Đồng bộ Topbar.
  - Thêm RoleThemeProvider cho teacher.
  - Fix redirect pages student/parent.

---
*File này chỉ mô tả kế hoạch và checklist. Các thay đổi sẽ được triển khai theo từng đợt nhỏ để tránh regression.*
