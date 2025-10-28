// src/app/dashboard/student/classes/[classId]/courses/page.tsx
export default function ClassCoursesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Bài học trong lớp</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="border rounded-xl p-4 hover:shadow-md transition cursor-pointer">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold">Bài {i}: Chủ đề bài học</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">Video</span>
            </div>
            <p className="text-sm text-gray-600">Thời lượng: 15 phút • 3 tài liệu đính kèm</p>
          </div>
        ))}
      </div>
    </div>
  );
}

