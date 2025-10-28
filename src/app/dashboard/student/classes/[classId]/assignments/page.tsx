// src/app/dashboard/student/classes/[classId]/assignments/page.tsx
export default function ClassAssignmentsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Bài tập trong lớp</h1>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-xl p-4 hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">Bài tập {i}: Chủ đề chương {i}</h3>
                <p className="text-sm text-gray-600 mt-1">Hạn nộp: 20/11/2025 • 23:59</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${i === 1 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                {i === 1 ? "Chưa nộp" : "Đã nộp"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

