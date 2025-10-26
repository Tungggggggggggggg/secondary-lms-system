export default function QuickActions() {
    const actions = [
      { icon: "📝", title: "Tạo bài giảng", desc: "Thêm nội dung mới" },
      { icon: "🏫", title: "Tạo lớp học", desc: "Mở lớp mới" },
      { icon: "✍️", title: "Giao bài tập", desc: "Tạo assignment" },
      { icon: "📊", title: "Xem báo cáo", desc: "Phân tích dữ liệu" },
    ];
  
    return (
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {actions.map((item, index) => (
          <button
            key={index}
            className="gradient-border rounded-2xl p-6 text-center hover-lift group"
          >
            <div className="text-5xl mb-3 animate-float">{item.icon}</div>
            <h3 className="font-bold text-gray-800 mb-2">{item.title}</h3>
            <p className="text-sm text-gray-600">{item.desc}</p>
          </button>
        ))}
      </div>
    );
  }