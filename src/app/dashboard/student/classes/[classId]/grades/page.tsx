// src/app/dashboard/student/classes/[classId]/grades/page.tsx
export default function ClassGradesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Điểm số trong lớp</h1>
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2 font-semibold">Bài</th>
              <th className="text-left px-4 py-2 font-semibold">Điểm</th>
              <th className="text-left px-4 py-2 font-semibold">Nhận xét</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-2">Bài kiểm tra {i}</td>
                <td className="px-4 py-2 font-semibold">{8 + (i % 3)}/10</td>
                <td className="px-4 py-2 text-gray-600">Làm tốt, cần chú ý phần sự kiện</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

