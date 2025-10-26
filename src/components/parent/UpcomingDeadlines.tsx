// src/components/parent/UpcomingDeadlines.tsx
export default function UpcomingDeadlines() {
    const deadlines = [
      {
        label: "SẮP ĐẾN HẠN",
        date: "Mai",
        subject: "Bài tập Địa lý",
        desc: "Chương 6 - Khí hậu",
        color: "border-red-200 bg-red-50 text-red-700",
      },
      {
        label: "QUAN TRỌNG",
        date: "T3 tuần sau",
        subject: "Project Tiếng Anh",
        desc: "Nhóm presentation",
        color: "border-orange-200 bg-orange-50 text-orange-700",
      },
      {
        label: "BÌNH THƯỜNG",
        date: "T5",
        subject: "Bài tập Lịch sử",
        desc: "Chương 4",
        color: "border-blue-200 bg-blue-50 text-blue-700",
      },
    ];
  
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          📅 Deadline sắp tới
        </h2>
        <div className="space-y-3">
          {deadlines.map((d) => (
            <div
              key={d.subject}
              className={`border rounded-xl p-4 ${d.color.split(" ")[1]} ${d.color.split(" ")[2]}`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`text-xs font-bold ${d.color.split(" ")[3]}`}>
                  {d.label}
                </span>
                <span className="text-xs font-medium">{d.date}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{d.subject}</h3>
              <p className="text-sm text-gray-600">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  