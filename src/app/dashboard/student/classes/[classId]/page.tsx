// src/app/student/classes/[classId]/page.tsx
import Link from "next/link";

export default function ClassDetailPage({ params }: { params: { classId: string } }) {
  return (
    <div className="p-6 space-y-6">
      {/* Class Header */}
      <div className="rounded-2xl overflow-hidden shadow-sm border">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Lịch sử 8A</h1>
              <p className="text-white/90">GV: Thầy Nguyễn Văn An</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-md bg-white/15 hover:bg-white/25 transition">Mã lớp: ABC123</button>
              <button className="px-4 py-2 rounded-md bg-white text-indigo-700 font-semibold hover:opacity-90 transition">Vào học ngay</button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x">
          <div className="p-4">
            <p className="text-sm text-gray-500">Tiến độ</p>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: "66%" }} />
              </div>
              <p className="text-sm text-gray-600 mt-1">8/12 bài học</p>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-500">Bài tập chờ</p>
            <p className="text-lg font-semibold text-gray-800 mt-1">3 bài</p>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-500">Lần cập nhật</p>
            <p className="text-lg font-semibold text-gray-800 mt-1">2 ngày trước</p>
          </div>
        </div>
      </div>

      {/* Liên kết tới các trang con */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href={`/dashboard/student/classes/${params.classId}/courses`} className="block">
          <div className="border rounded-xl p-4 hover:shadow-md transition cursor-pointer h-full">
            <h3 className="font-semibold mb-1">Bài học</h3>
            <p className="text-sm text-gray-600">Danh sách nội dung bài học trong lớp.</p>
          </div>
        </Link>
        <Link href={`/dashboard/student/classes/${params.classId}/assignments`} className="block">
          <div className="border rounded-xl p-4 hover:shadow-md transition cursor-pointer h-full">
            <h3 className="font-semibold mb-1">Bài tập</h3>
            <p className="text-sm text-gray-600">Bài tập cần làm và hạn nộp.</p>
          </div>
        </Link>
        <Link href={`/dashboard/student/classes/${params.classId}/grades`} className="block">
          <div className="border rounded-xl p-4 hover:shadow-md transition cursor-pointer h-full">
            <h3 className="font-semibold mb-1">Điểm số</h3>
            <p className="text-sm text-gray-600">Kết quả đánh giá và nhận xét.</p>
          </div>
        </Link>
        <Link href={`/dashboard/student/classes/${params.classId}/discussions`} className="block">
          <div className="border rounded-xl p-4 hover:shadow-md transition cursor-pointer h-full">
            <h3 className="font-semibold mb-1">Thảo luận</h3>
            <p className="text-sm text-gray-600">Thảo luận và trao đổi trong lớp.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}