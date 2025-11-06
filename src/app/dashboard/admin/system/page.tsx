import AnimatedSection from "@/components/admin/AnimatedSection";

export default function AdminSystemPage() {
  return (
    <AnimatedSection className="space-y-4">
      <h1 className="text-xl font-semibold">System</h1>
      <p className="text-sm text-gray-600">Trang dành cho SUPER_ADMIN: cài đặt và giám sát hệ thống.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded border">Tổng số người dùng</div>
        <div className="p-4 bg-white rounded border">Tổng số lớp</div>
        <div className="p-4 bg-white rounded border">Tệp lưu trữ</div>
      </div>
    </AnimatedSection>
  );
}


