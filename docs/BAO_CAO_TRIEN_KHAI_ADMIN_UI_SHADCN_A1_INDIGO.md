# BÁO CÁO TRIỂN KHAI UI ADMIN (shadcn patterns) — Modern SaaS Light (A1 Indigo)

## 1) Mục tiêu
- Làm lại toàn bộ UI khu vực **Admin** theo phong cách **Modern SaaS (Light)**.
- Chuẩn hoá theo **shadcn/ui patterns** (tokens → primitives → overlay → shell → pages).
- Đảm bảo **a11y**, responsive, nhất quán spacing/typography.

## 2) Quyết định đã xác nhận
- **(1) A1**: Accent chính cho Admin = **Indigo**.
- **(2) B1**: Sidebar **sáng** (Modern SaaS Light).

## 3) Nguyên tắc triển khai (bắt buộc)
- Dùng tokens `bg-background`, `text-foreground`, `border-border`, `ring-ring`, `bg-card`…
- Hạn chế hardcode `gray-*`/`blue-*` trong admin.
- Overlay (Dialog/DropdownMenu) phải theo Radix/shadcn để có:
  - Focus trap
  - Keyboard navigation
  - ARIA attributes chuẩn

## 4) Phạm vi (role Admin)
### 4.1. Routes/pages
- `src/app/dashboard/admin/dashboard/page.tsx`
- `src/app/dashboard/admin/users/page.tsx`
- `src/app/dashboard/admin/users/[id]/page.tsx`
- `src/app/dashboard/admin/classrooms/page.tsx`
- `src/app/dashboard/admin/classrooms/[id]/page.tsx`
- `src/app/dashboard/admin/audit-logs/page.tsx`
- `src/app/dashboard/admin/settings/page.tsx`
- `src/app/dashboard/admin/organizations/page.tsx`
- `src/app/dashboard/admin/organizations/[id]/page.tsx`
- Layout: `src/app/dashboard/admin/layout.tsx`

### 4.2. Layout/components dùng chung trong admin
- Shell: `src/components/layout/DashboardLayout.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/DashboardTopbar.tsx`
- Admin components: `src/components/admin/*`
- UI primitives: `src/components/ui/*`
- Theme/tokens: `src/app/globals.css`, `tailwind.config.ts`

## 5) Bảng màu đơn giản (Admin Light)
Mục tiêu: ít màu, sạch, rõ hierarchy.

- **Background**: slate-50 (rất nhạt)
- **Card**: trắng
- **Text chính**: slate-900
- **Text phụ**: slate-600
- **Border**: slate-200
- **Primary (Admin)**: indigo-600
- **Destructive**: rose-600

Triển khai qua CSS variables (HSL) trong scope `.theme-admin` để shadcn tokens tự “ăn màu”.

## 6) Milestones + Checklist theo file

### M0 — Báo cáo & Checklist (file này)
- [x] Tạo file báo cáo để theo dõi

### M1 — Theme tokens cho Admin (A1 Indigo)
- [x] `src/app/globals.css`
  - [x] Thêm scope `.theme-admin` override các biến `--background`, `--foreground`, `--primary`, `--ring`, `--border`, `--destructive`…
- [x] `src/app/dashboard/admin/layout.tsx`
  - [x] Bọc admin bằng class `.theme-admin`
  - [x] Đồng bộ accent theo A1 (Indigo) (tạm thời map RoleThemeProvider sang `blue` để gần Indigo)

### M2 — Chuẩn hoá UI primitives theo shadcn patterns
- [x] `src/components/ui/card.tsx` (dùng `bg-card`, `text-card-foreground`, `border-border`)
- [x] `src/components/ui/table.tsx` (đảm bảo header/cell theo tokens)
- [x] `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx` (focus ring theo `ring-ring`)
- [x] `src/components/ui/badge.tsx` (variants semantic)
- [x] `src/components/ui/alert.tsx` (variants semantic)

### M3 — Overlay components (a11y)
- [ ] `src/components/ui/dialog.tsx`
  - [ ] Chuyển sang Radix/shadcn Dialog pattern (focus trap, Esc)
- [ ] `src/components/ui/dropdown-menu.tsx`
  - [ ] Chuyển sang Radix/shadcn DropdownMenu pattern
- [ ] `src/components/ui/checkbox.tsx`
  - [ ] Giữ native hoặc nâng cấp Radix (tuỳ mức độ refactor), đảm bảo focus-visible rõ
- [ ] `src/components/ui/select.tsx`
  - [ ] Giai đoạn 1 có thể giữ native để tránh regression

### M4 — Admin shell (sidebar/topbar/container)
- [x] `src/components/layout/Sidebar.tsx`
  - [x] Admin sidebar theo B1 (light + accent Indigo)
- [ ] `src/components/layout/DashboardLayout.tsx`
  - [x] Background admin theo tokens (`bg-background text-foreground`) để theme-admin áp dụng đồng bộ
  - [ ] Container spacing chuẩn (8pt grid)

### M5 — Refactor từng trang admin
- [ ] Dashboard: `src/app/dashboard/admin/dashboard/page.tsx`
- [ ] Users list + dialogs: `src/app/dashboard/admin/users/page.tsx`
- [ ] User detail: `src/app/dashboard/admin/users/[id]/page.tsx`
- [ ] Classrooms list + dialogs: `src/app/dashboard/admin/classrooms/page.tsx`
- [ ] Classroom detail: `src/app/dashboard/admin/classrooms/[id]/page.tsx`
- [ ] Audit logs: `src/app/dashboard/admin/audit-logs/page.tsx`
- [ ] Settings: `src/app/dashboard/admin/settings/page.tsx`
- [ ] Organizations list/detail: `src/app/dashboard/admin/organizations/page.tsx`, `src/app/dashboard/admin/organizations/[id]/page.tsx`

### M6 — QA UI/UX
- [ ] Responsive (mobile/tablet/desktop)
- [ ] Keyboard navigation (Tab/Shift+Tab/Esc)
- [ ] Focus states rõ ràng
- [ ] Loading/Empty/Error states đồng bộ

## 7) Definition of Done (Admin)
- Admin có theme light nhất quán, accent Indigo.
- Tất cả trang admin dùng patterns nhất quán (Card/Table/Form/Badge/Alert).
- Dialog/DropdownMenu hoạt động đúng a11y.
- Pass type-check + lint.

## 8) Files đã sửa (tính đến hiện tại)
- `src/app/globals.css`
- `src/app/dashboard/admin/layout.tsx`
- `src/components/layout/DashboardLayout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `tailwind.config.ts`
