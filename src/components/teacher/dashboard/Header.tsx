"use client";

export default function Header() {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">Chào mừng trở lại! 👋</h1>
          <p className="text-gray-600 mt-1">
            Hôm nay là <span className="font-semibold">Thứ Sáu, 24 tháng 10, 2025</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all">
            <span className="text-2xl">🔔</span>
            <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
      </div>
    </header>
  );
}