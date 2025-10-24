"use client";

export default function Topbar() {
  return (
    <header className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
      {/* Ô tìm kiếm */}
      <div className="flex items-center gap-2 w-full max-w-md bg-gray-100 px-3 py-2 rounded-lg">
        <span className="text-gray-500">🔍</span>
        <input
          type="text"
          placeholder="Tìm học sinh, bài tập hoặc khóa học..."
          className="bg-transparent w-full outline-none text-gray-700 placeholder-gray-400"
        />
      </div>

      {/* Thông báo + Hồ sơ */}
      <div className="flex items-center gap-4">
        <button className="relative bg-gray-100 p-2 rounded-full hover:bg-gray-200">
          🔔
          <span className="absolute top-1 right-1 bg-red-500 w-2 h-2 rounded-full"></span>
        </button>
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white w-10 h-10 flex items-center justify-center rounded-full font-semibold">
            CL
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Cô Lan</h3>
            <p className="text-sm text-gray-500">Đang giảng dạy</p>
          </div>
        </div>
      </div>
    </header>
  );
}
