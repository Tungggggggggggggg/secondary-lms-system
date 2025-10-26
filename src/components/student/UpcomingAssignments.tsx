// src/components/student/UpcomingAssignments.tsx
export default function UpcomingAssignments() {
    const assignments = [
      {
        label: "SẮP HẾT HẠN",
        color: "red",
        title: "Bài tập Lịch sử chương 3",
        desc: "Còn 3 giờ để nộp",
        date: "Hôm nay",
      },
      {
        label: "QUAN TRỌNG",
        color: "yellow",
        title: "Project Tiếng Anh",
        desc: "Nhóm 4 thành viên",
        date: "Mai",
      },
      {
        label: "BÌNH THƯỜNG",
        color: "blue",
        title: "Làm bài tập Địa lý",
        desc: "Chương 5 - Khí hậu",
        date: "T4",
      },
    ];
  
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          📋 Bài tập sắp tới
        </h2>
        <div className="space-y-4">
          {assignments.map((a) => (
            <div
              key={a.title}
              className={`border-l-4 border-${a.color}-500 bg-${a.color}-50 rounded-r-xl p-4`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-semibold text-${a.color}-600 bg-${a.color}-100 px-2 py-1 rounded-full`}
                >
                  {a.label}
                </span>
                <span className="text-xs text-gray-500">{a.date}</span>
              </div>
              <h4 className="font-bold text-gray-800 mb-1">{a.title}</h4>
              <p className="text-sm text-gray-600">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  