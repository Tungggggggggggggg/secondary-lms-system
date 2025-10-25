// src/components/parent/ChildSelector.tsx
export default function ChildSelector() {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
              NV
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Nguyễn Văn A</h2>
              <p className="text-sm text-gray-600">Lớp 8A - Trường THCS ABC</p>
            </div>
          </div>
          <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
            Chọn con khác
          </button>
        </div>
      </div>
    );
  }
  