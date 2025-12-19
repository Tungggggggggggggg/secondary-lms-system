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

### 4.3. Đồng bộ 4 role (Admin + Teacher + Student + Parent)
- 4 role chia sẻ cùng một "design system"; khác nhau chủ yếu ở **accent** và **surface**:

  | Role    | Accent chính | Prefix token   | Ghi chú |
  |---------|-------------|----------------|--------|
  | Admin   | indigo      | `admin-*`      | Đã chuẩn hoá trong báo cáo A1 Indigo (Admin). |
  | Teacher | blue        | `teacher-*`    | Dùng cho toàn bộ shell + page teacher. |
  | Student | green       | `student-*`    | Dùng cho toàn bộ shell + page student. |
  | Parent  | amber       | `parent-*`     | Dùng cho toàn bộ shell + page parent. |

- Các component core phải **giống hierarchy/API giữa 4 role**, chỉ khác accent:
  - `PageHeader` / `AdminPageHeader`
  - `SectionCard`
  - `StatsGrid`
  - `EmptyState`
  - Các thanh bulk/selection (ví dụ: bar chọn nhiều học sinh / lớp / con)
- Tất cả component trên **lấy accent từ RoleThemeProvider / context**, không hardcode class `bg-blue-50`, `text-emerald-700`, ...
- Pattern list/detail/empty/bulk **nên giống nhau giữa 4 role** (ví dụ: dashboard overview, list lớp/lớp học, detail, bulk selection).

## 5) Checklist triển khai (ưu tiên theo impact/risk)

### P0 — Shell & Consistency nền (Impact cao / Risk thấp)
- [ ] `src/components/layout/DashboardLayout.tsx`
  - [x] Dùng background theo role surface (`teacher-surface`, `student-surface`, `parent-surface`) thay vì `bg-gray-50` chung.
  - [ ] Chuẩn bị điểm đặt “container wrapper” để loại bỏ `p-8` rải rác (triển khai dần).
- [x] `src/components/layout/DashboardTopbar.tsx`
  - [x] Topbar dùng nền + border nhất quán, ring theo role.
- [x] `src/app/dashboard/teacher/layout.tsx`
  - [x] Bọc `RoleThemeProvider color="blue"` để đồng bộ Button/controls.
- [x] `src/app/dashboard/student/page.tsx`, `src/app/dashboard/parent/page.tsx`
  - [x] Loại UI redirect gradient lệch theme; tránh ProtectedRoute lồng thừa.
 - [ ] `RoleThemeProvider` / context màu theo role
   - [ ] Đảm bảo mapping 4 role (`admin/teacher/student/parent`) → accent/surface/token thống nhất, khớp với A1 Indigo bên admin.

### P1 — Shared components “role-aware” (Impact cao / Risk trung bình)
- [x] `src/components/shared/SectionCard.tsx`
  - [x] Thêm `variant` theo role (teacher/student/parent + tương thích admin) để bỏ style hardcode blue.
- [x] `src/components/shared/StatsGrid.tsx`
  - [x] Cho phép truyền `accent`/`variant` hoặc đọc từ RoleThemeProvider để focus ring không bị cố định green cho mọi role.
- [x] `src/components/ui/tabs.tsx`
  - [x] (Tuỳ chọn) hỗ trợ `variant` theo role hoặc token-based để giảm override lặp giữa 4 role.
- [x] `src/components/ui/breadcrumb.tsx`
  - [x] Giảm hardcode `text-gray-*` sang token/role accent (tôn trọng màu của từng role).

### P2 — Page refactor theo role (Impact cao / Risk trung bình-cao)
**Cross-role patterns (áp dụng đồng thời cho 4 role)**  
- [ ] Dashboard overview (cards/stats) dùng cùng pattern `PageHeader + StatsGrid + SectionCard`.
- [ ] List pages (classrooms/classes/children/progress/assignments) dùng chung layout: header + filter bar + table/card list + EmptyState.
- [ ] Detail pages (classroom detail, assignment detail, progress detail, user detail) dùng chung pattern: hero header + info cards + action bar + related lists.
- [ ] Bulk actions (selection bar + checkbox + confirm) thống nhất UX (vị trí thanh, wording, nút dangerous/secondary).

#### Teacher
- [x] `src/app/dashboard/teacher/courses/page.tsx`
  - [x] Đổi header thủ công sang `PageHeader` + `Breadcrumb`.
  - [x] Chuẩn hoá `Input/Select` dùng `color="blue"` đồng bộ.
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
- [x] `src/app/dashboard/student/classes/page.tsx`
  - [x] Skeleton đang dùng `bg-gray-200`; chuyển sang `Skeleton` component để thống nhất.
- [x] Token hoá màu trung tính + focus ring token theo role (Student)
  - Thay `bg-white/bg-gray*/text-gray*/border-gray*/slate*` → `bg-card/bg-background/bg-muted`, `text-foreground/text-muted-foreground`, `border-border`
  - Chuẩn hoá focus ring: `focus-visible:ring-ring` + `ring-offset-background` (thay cho `ring-*-*` hardcode)
  - Các component đã xử lý tiêu biểu:
    - `src/components/student/lesson/LessonDetailView.tsx`
    - `src/components/student/lesson/LessonTutorChat.tsx`
    - `src/components/student/assignments/*` (Quiz/Eassy forms, SubmissionReview, comments, file submission)
    - `src/components/student/SearchClasses.tsx`
    - `src/components/student/exam/ExamInterface.tsx`
    - `src/components/student/ClassGridSkeleton.tsx`
    - `src/components/student/classroom/*` (Header/Tabs/Overview/QuickActions)
    - `src/components/student/ClassesToolbar.tsx`, `JoinClass.tsx`, `AssignmentFilters.tsx`, `DueCountdownChip.tsx`, `grades/GradeStatusBadge.tsx`
  - Kết quả QA nhanh:
    - `npm run lint`: PASS
    - `npm run build`: PASS
- [ ] `src/app/dashboard/student/grades/page.tsx`
  - [ ] Tách badge/status thành component tái dùng (giảm hardcode class string).
- [ ] `src/app/dashboard/student/assignments/[id]/page.tsx`
  - [ ] Có nhiều block `bg-white rounded-xl shadow` rải rác; cần chuẩn hoá Card/Section.

#### Parent
- [ ] `src/app/dashboard/parent/progress/page.tsx`
  - [x] Thay `<select>` thuần bằng `Select` component để đồng bộ.
  - [ ] Giảm hardcode `text-gray-*` sang variant.
- [x] Token hoá màu trung tính + focus ring token theo role (Parent)
  - Thay `bg-white/bg-gray*/text-gray*/border-gray*/slate*` → `bg-card/bg-background/bg-muted`, `text-foreground/text-muted-foreground`, `border-border`
  - Chuẩn hoá focus ring: `focus-visible:ring-ring` + `ring-offset-background`
  - Các component đã xử lý tiêu biểu:
    - `src/components/parent/AcademicPerformance.tsx`
    - `src/components/parent/MyChildren.tsx`
    - `src/components/parent/UpcomingEvents.tsx`
    - `src/components/parent/PendingRequestItem.tsx`, `SearchResultItem.tsx`
    - `src/components/parent/StudentItem.tsx`, `StudentCard.tsx`, `ClassroomItem.tsx`
    - `src/components/parent/QuickActions.tsx`, `QuickStats.tsx`
  - Kết quả QA nhanh:
    - `npm run lint`: PASS
    - `npm run build`: PASS
- [ ] `src/app/dashboard/parent/children/page.tsx`
  - [ ] Chuẩn loading/error state theo `Skeleton/EmptyState` (hiện đang mixed).

### P3 — A11y & QA (Impact cao / Risk thấp)
- [ ] Tất cả interactive “card click” (`article/div` + `onClick`) phải hỗ trợ keyboard:
  - [x] Enter/Space trigger.
  - [x] Focus-visible rõ.
  - [x] Tránh double-trigger khi có nested interactive (stopPropagation/guard currentTarget).
- [ ] Notes phát hiện thêm trong quá trình triển khai:
  - [x] Nhiều card/list còn hardcode `focus-visible:ring-*-500` → đã thêm scope theme theo role (`theme-teacher/theme-student/theme-parent`) để override `--ring` và đã đổi dần sang `focus-visible:ring-ring` + `ring-offset-background` (teacher + student + parent các điểm chính).
  - [ ] Một số component role pages vẫn hardcode `bg-white`/`text-gray-*`/`bg-*-50` (ví dụ list/cards teacher) → cần QA và chuyển dần sang token (`bg-card`, `text-foreground`, `muted-foreground`, ...).
- [ ] Kiểm tra:
  - Responsive (mobile/tablet/desktop)
  - Tab order, Esc, focus trap (Dialog)
  - Loading/empty/error consistency

## 6) Hạng mục mình đã triển khai (đợt 1)
- [x] Đồng bộ background shell theo role.
- [x] Đồng bộ Topbar.
- [x] Thêm `RoleThemeProvider` cho teacher.
- [x] Fix redirect pages student/parent.

## 7) Hạng mục còn lại (chưa hoàn tất)
- [ ] Chuẩn hoá container wrapper để giảm `p-8` rải rác.
- [ ] Chuẩn hoá mapping `RoleThemeProvider` cho đủ 4 role (admin/teacher/student/parent).
- [ ] Refactor các page theo role (P2) theo pattern list/detail thống nhất.
- [ ] Teacher: `classrooms/page.tsx`, `students/page.tsx`, `ExamMonitoringDashboard`.
- [ ] Student: `grades/page.tsx`, `assignments/[id]/page.tsx`.
- [ ] Parent: `progress/page.tsx` (giảm `text-gray-*`), `children/page.tsx` (loading/error state thống nhất).

---
*File này chỉ mô tả kế hoạch và checklist. Các thay đổi sẽ được triển khai theo từng đợt nhỏ để tránh regression.*
