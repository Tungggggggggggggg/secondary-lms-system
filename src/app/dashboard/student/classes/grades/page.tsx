// src/app/dashboard/student/classes/grades/page.tsx
export default function AllClassesGradesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Điểm số của tôi</h1>
      <div className="space-y-4">
        {["Lịch sử 8A", "Địa lý 8B", "Tiếng Anh 8C"].map((name, idx) => (
          <div key={name} className="border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{name}</h3>
                <p className="text-sm text-gray-600">Trung bình: {8 + (idx % 2)}/10</p>
              </div>
              <button className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Xem chi tiết</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

