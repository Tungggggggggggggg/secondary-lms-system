"use client";

export default function Notifications() {
  const notifs = [
    {
      icon: "📝",
      title: "Bài tập mới được nộp",
      content: "Nguyễn Văn An đã nộp bài 'Chiến tranh Việt Nam' - 5 phút trước",
    },
    {
      icon: "📊",
      title: "Điểm số mới",
      content: "Lớp 8A có điểm trung bình 8.2 cho bài kiểm tra - 1 giờ trước",
    },
    {
      icon: "💬",
      title: "Tin nhắn từ phụ huynh",
      content: "Phụ huynh Trần Thị B hỏi về tiến độ học tập - 2 giờ trước",
    },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Thông báo mới</h3>
      <div className="space-y-3">
        {notifs.map((n, i) => (
          <div
            key={i}
            className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition"
          >
            <div className="text-2xl">{n.icon}</div>
            <div>
              <h4 className="font-medium text-gray-800">{n.title}</h4>
              <p className="text-sm text-gray-600">{n.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
