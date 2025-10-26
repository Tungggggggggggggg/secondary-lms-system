// src/components/parent/TeacherContacts.tsx
export default function TeacherContacts() {
    const teachers = [
      {
        icon: "👨‍🏫",
        bg: "bg-yellow-100",
        name: "Thầy Nguyễn Văn An",
        subject: "Lịch sử",
      },
      {
        icon: "👩‍🏫",
        bg: "bg-teal-100",
        name: "Cô Trần Thị Bình",
        subject: "Địa lý",
      },
    ];
  
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          💬 Liên hệ Giáo viên
        </h2>
  
        <div className="space-y-3">
          {teachers.map((t) => (
            <div
              key={t.name}
              className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-10 h-10 ${t.bg} rounded-full flex items-center justify-center text-lg`}
                >
                  {t.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  <p className="text-xs text-gray-500">{t.subject}</p>
                </div>
              </div>
              <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                Gửi tin nhắn →
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }
  