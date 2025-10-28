// src/app/dashboard/student/classes/[classId]/discussions/page.tsx
export default function ClassDiscussionsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Thảo luận trong lớp</h1>
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="border rounded-xl p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Chủ đề {i}: Ảnh hưởng của chiến tranh</h3>
              <span className="text-xs text-gray-500">5 bình luận</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Hãy chia sẻ suy nghĩ của bạn về sự kiện X trong bài học.</p>
          </div>
        ))}
        <div className="border rounded-xl p-4">
          <textarea className="w-full border rounded-md p-2 text-sm" rows={3} placeholder="Viết bình luận..." />
          <div className="text-right mt-2">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">Gửi</button>
          </div>
        </div>
      </div>
    </div>
  );
}


