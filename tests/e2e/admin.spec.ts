import { test, expect } from '@playwright/test';

// Lưu ý: Các trang admin yêu cầu đăng nhập.
// Để chạy e2e thực sự, cần chuẩn bị trước session/cookie NextAuth hoặc mở endpoint login mock.
// Tạm thời đánh dấu skip để không fail CI cho đến khi có dữ liệu/flow đăng nhập.

test.describe('Admin pages (smoke)', () => {
  test.skip(true, 'Yêu cầu phiên đăng nhập; cần cấu hình session trước khi bật E2E.');

  test('overview page renders', async ({ page }) => {
    await page.goto('/dashboard/admin/overview');
    await expect(page.getByText('Tổng quan quản trị')).toBeVisible();
  });

  test('reports page renders', async ({ page }) => {
    await page.goto('/dashboard/admin/reports');
    await expect(page.getByText('Reports')).toBeVisible();
  });
});


