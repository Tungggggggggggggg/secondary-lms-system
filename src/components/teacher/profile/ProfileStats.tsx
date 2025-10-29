export default function ProfileStats() {
  const stats = [
    {
      title: "Kinh nghiệm",
      value: "10",
      unit: "năm",
      icon: "⏳",
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Học sinh đã dạy",
      value: "1.2k+",
      unit: "học sinh",
      icon: "👥",
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "Lượt đánh giá",
      value: "4.9",
      unit: "sao",
      icon: "⭐",
      color: "from-yellow-500 to-yellow-600"
    },
    {
      title: "Chứng chỉ",
      value: "12",
      unit: "chứng chỉ",
      icon: "🎓",
      color: "from-green-500 to-green-600"
    }
  ];

  const achievements = [
    {
      title: "Giáo viên xuất sắc",
      year: "2024",
      icon: "🏆"
    },
    {
      title: "Sáng kiến giảng dạy",
      year: "2023",
      icon: "💡"
    },
    {
      title: "Giáo viên tiêu biểu",
      year: "2022",
      icon: "🌟"
    }
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Statistics */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Thống kê tổng quan</h3>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className={`bg-gradient-to-br ${stat.color} rounded-xl p-4 text-white`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{stat.icon}</span>
                <span className="text-2xl font-bold">{stat.value}</span>
              </div>
              <div className="text-sm">
                <div className="font-medium">{stat.title}</div>
                <div className="text-white/80">{stat.unit}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Thành tích đạt được</h3>
        <div className="space-y-4">
          {achievements.map((achievement, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-xl flex items-center justify-center text-2xl">
                {achievement.icon}
              </div>
              <div>
                <div className="font-semibold text-gray-800">{achievement.title}</div>
                <div className="text-sm text-gray-600">Năm {achievement.year}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}