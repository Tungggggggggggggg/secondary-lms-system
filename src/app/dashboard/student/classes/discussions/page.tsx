// src/app/dashboard/student/classes/discussions/page.tsx
export default function AllClassesDiscussionsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Thảo luận gần đây</h1>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-xl p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Chủ đề {i}: Sự kiện lịch sử quan trọng</h3>
              <span className="text-xs text-gray-500">Lớp: Lịch sử 8A</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">5 bình luận • Cập nhật 1 giờ trước</p>
          </div>
        ))}
      </div>
    </div>
  );
}

