"use client";

import React from 'react';
import { BookOpen, Clock, Award, TrendingUp, Calendar, CheckCircle, PlayCircle, FileText, Target, Brain, MessageSquare, Star, ChevronRight, BarChart3, Book, PenTool, Users, Sparkles } from 'lucide-react';

// Quick Actions Component
const QuickActions = () => {
  const actions = [
    { icon: '📚', label: 'Tạo bài giảng', subtitle: 'Thiết nội dung mới' },
    { icon: '🏫', label: 'Tạo lớp học', subtitle: 'Mở lớp mới' },
    { icon: '✏️', label: 'Giao bài tập', subtitle: 'Tạo assignment' },
    { icon: '📊', label: 'Xem báo cáo', subtitle: 'Phân tích dữ liệu' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action, index) => (
        <button
          key={index}
          className="bg-white rounded-2xl p-6 hover:shadow-lg transition-all border border-gray-100 text-left group"
        >
          <div className="text-4xl mb-3">{action.icon}</div>
          <h3 className="font-semibold text-gray-900 mb-1">{action.label}</h3>
          <p className="text-sm text-gray-500">{action.subtitle}</p>
        </button>
      ))}
    </div>
  );
};

// Stats Overview Component
const StatsOverview = () => {
  const stats = [
    { 
      icon: '👥', 
      label: 'Tổng sinh viên', 
      value: '384', 
      progress: 12,
      progressLabel: 'so với tháng trước',
      gradient: 'from-blue-500 to-blue-600'
    },
    { 
      icon: '🎓', 
      label: 'Lớp học', 
      value: '12', 
      progress: 12,
      progressLabel: 'lớp mới tuần này',
      gradient: 'from-purple-500 to-purple-600'
    },
    { 
      icon: '📝', 
      label: 'Bài tập', 
      value: '56', 
      progress: 18,
      progressLabel: 'bài mới tháng này',
      gradient: 'from-pink-500 to-pink-600'
    },
    { 
      icon: '⭐', 
      label: 'Đánh giá', 
      value: '28', 
      progress: 11,
      progressLabel: 'câu trả lời điểm',
      gradient: 'from-orange-500 to-yellow-500'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-6 text-white shadow-lg`}>
          <div className="flex items-start justify-between mb-4">
            <div className="text-3xl">{stat.icon}</div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 flex items-center gap-1">
              <span className="text-xs font-semibold">{stat.progress}%</span>
            </div>
          </div>
          <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
          <p className="text-sm opacity-90">{stat.label}</p>
          <p className="text-xs opacity-75 mt-1">{stat.progressLabel}</p>
        </div>
      ))}
    </div>
  );
};

// Recent Classes Component
const RecentClasses = () => {
  const classes = [
    { 
      subject: 'Lịch sử 8A1', 
      grade: '8 học sinh',
      time: 'Thứ 2, 4, 6',
      schedule: '7:00 - 8:30',
      status: 'Đang hoạt động',
      statusColor: 'bg-green-100 text-green-700',
      remaining: '5 bài chưa chấm',
      color: 'bg-yellow-500',
      icon: '📚'
    },
    { 
      subject: 'Địa lý 9D2', 
      grade: '32 học sinh',
      time: 'Thứ 3, 5, 7',
      schedule: '8:00 - 10:30',
      status: 'Đang hoạt động',
      statusColor: 'bg-green-100 text-green-700',
      remaining: 'Lớp 5C 09/27',
      color: 'bg-teal-500',
      icon: '🌍'
    },
    { 
      subject: 'Tiếng Anh 7C', 
      grade: '35 học sinh',
      time: 'Thứ 2, 4, 6',
      schedule: '13:00 - 14:30',
      status: 'Đang hoạt động',
      statusColor: 'bg-green-100 text-green-700',
      remaining: '2 bài chưa chấm',
      color: 'bg-blue-500',
      icon: '🇬🇧'
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>🏫</span> Lớp học gần đây
        </h2>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Xem tất cả →
        </button>
      </div>
      
      <div className="space-y-4">
        {classes.map((cls, index) => (
          <div key={index} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3 flex-1">
                <div className={`${cls.color} text-white w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold`}>
                  {cls.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">{cls.subject}</h3>
                  <p className="text-sm text-gray-600 mb-2">{cls.grade}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      📅 {cls.time}
                    </span>
                    <span className="flex items-center gap-1">
                      ⏰ {cls.schedule}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className={`${cls.statusColor} text-xs font-medium px-3 py-1 rounded-full`}>
                  {cls.status}
                </span>
                <p className="text-xs text-gray-500 mt-2">{cls.remaining}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Performance Chart Component
const PerformanceChart = () => {
  const subjects = [
    { name: 'Lịch sử', subtitle: 'Chiến tranh thế giới lần 2', progress: 92, color: 'bg-yellow-500' },
    { name: 'Địa lý', subtitle: 'Châu Á và châu Mỹ', progress: 88, color: 'bg-green-500' },
    { name: 'Tiếng Anh', subtitle: 'Thì hiện tại hoàn thành', progress: 85, color: 'bg-blue-500' },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>📈</span> Hiệu suất giảng dạy
        </h2>
      </div>
      
      <div className="space-y-6">
        {subjects.map((subject, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                <p className="text-sm text-gray-500">{subject.subtitle}</p>
              </div>
              <span className="text-lg font-bold text-gray-900">{subject.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`${subject.color} h-3 rounded-full transition-all`}
                style={{ width: `${subject.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Upcoming Tasks Component
const UpcomingTasks = () => {
  type PriorityType = 'KHẨN CẤP' | 'QUAN TRỌNG' | 'BÌNH THƯỜNG';
  
  const tasks = [
    { priority: 'KHẨN CẤP' as PriorityType, label: 'Chấm bài kiểm tra giữa kỳ', time: 'Lịch sử 8A2 - 12 bài', status: 'Hôm nay' },
    { priority: 'QUAN TRỌNG' as PriorityType, label: 'Họp phụ huynh trực tuyến', time: 'Lớp 9D2 - 13:00', status: 'Mai' },
    { priority: 'BÌNH THƯỜNG' as PriorityType, label: 'Tạo bài giảng mới', time: 'Địa lý - Chương 3', status: 'T7' },
  ];

  const priorityColors: Record<PriorityType, string> = {
    'KHẨN CẤP': 'bg-red-100 text-red-700 border-red-200',
    'QUAN TRỌNG': 'bg-orange-100 text-orange-700 border-orange-200',
    'BÌNH THƯỜNG': 'bg-blue-100 text-blue-700 border-blue-200'
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>📋</span> Công việc sắp tới
        </h2>
      </div>
      
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <div key={index} className={`border rounded-xl p-4 ${priorityColors[task.priority]}`}>
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-bold">{task.priority}</span>
              <span className="text-xs font-medium">{task.status}</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{task.label}</h3>
            <p className="text-sm opacity-75">{task.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Recent Activity Component
const RecentActivity = () => {
  const activities = [
    { 
      user: 'Nguyễn Minh Anh', 
      action: 'nộp bài tập Địa lý',
      time: 'Tiếng Anh 7C - 1 giờ trước',
      avatar: 'bg-blue-500'
    },
    { 
      user: 'Trần Thanh Tâm', 
      action: 'hỏi về chính âm địa chỉnh',
      time: 'Địa lý 9D2 - 2 giờ trước',
      avatar: 'bg-pink-500'
    },
    { 
      user: 'Lê Hoàng', 
      action: 'đăng ký lớp',
      time: 'Tiếng Anh 7C - 3 giờ trước',
      avatar: 'bg-green-500'
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>⚡</span> Hoạt động gần đây
        </h2>
      </div>
      
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className={`${activity.avatar} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm`}>
              {activity.user.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-semibold">{activity.user}</span> {activity.action}
              </p>
              <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Weekly Goals Component
const WeeklyGoals = () => {
  return (
    <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500 rounded-2xl p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span>🎯</span> Mục tiêu tuần này
        </h2>
        <span className="text-sm font-semibold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
          28/32
        </span>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span>Chấm bài tập</span>
            <span className="font-semibold">3/3</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-white h-2 rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span>Tạo bài giảng mới</span>
            <span className="font-semibold">3/4</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-white h-2 rounded-full" style={{ width: '75%' }} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span>Phản hồi phụ huynh</span>
            <span className="font-semibold">13/15</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-white h-2 rounded-full" style={{ width: '87%' }} />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mt-4 flex items-center gap-3">
          <div className="text-2xl">🔥</div>
          <div>
            <p className="font-semibold text-sm">Streak 15 ngày!</p>
            <p className="text-xs opacity-90">Bạn đã dạy 15 ngày liên tiếp</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Recent Content Component
const RecentContent = () => {
  const content = [
    { 
      subject: 'Lịch sử',
      title: 'Chiến tranh Việt Nam 1945-1975',
      subtitle: 'Tổng quan chiến tranh, những nhân vật chủ thể xã hội',
      views: '1,234 lượt xem',
      duration: '25 Phút',
      lessons: '8 Bài học',
      icon: '📚',
      color: 'bg-yellow-500'
    },
    { 
      subject: 'Địa lý',
      title: 'Khí hậu Đông Nam Á',
      subtitle: 'Đặc điểm khí hậu nhiệt đới gió mùa của Việt Nam và các nước',
      views: '856 lượt xem',
      duration: '18 Phút',
      lessons: '5 Bài học',
      icon: '🌍',
      color: 'bg-teal-500'
    },
    { 
      subject: 'Tiếng Anh',
      title: 'Present Perfect Tense',
      subtitle: 'Cách sử dụng và bài tập thực hành thì hiện tại hoàn thành',
      views: '2,145 lượt xem',
      duration: '42 Phút',
      lessons: '12 Bài học',
      icon: '🇬🇧',
      color: 'bg-blue-500'
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>📚</span> Thư viện nội dung gần đây
        </h2>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Xem tất cả →
        </button>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        {content.map((item, index) => (
          <div key={index} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all group">
            <div className={`${item.color} h-32 flex items-center justify-center text-6xl`}>
              {item.icon}
            </div>
            <div className="p-4">
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {item.subject}
              </span>
              <h3 className="font-bold text-gray-900 mt-2 mb-1 group-hover:text-blue-600 transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.subtitle}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                <span>👁️ {item.views}</span>
                <span>⏱️ {item.duration}</span>
              </div>
              <div className="text-xs text-gray-500">
                📖 {item.lessons}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Achievements Component
const Achievements = () => {
  return (
    <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-2xl p-8 text-center text-white">
      <div className="text-6xl mb-4">🏆</div>
      <h2 className="text-2xl font-bold mb-2">Thành tích nổi bật!</h2>
      <p className="mb-6 opacity-90">Bạn đã đạt được những mục tiêu xuất sắc!</p>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
          <div className="text-3xl mb-2">📚</div>
          <h3 className="font-bold text-sm mb-1">Top Educator</h3>
          <p className="text-xs opacity-90">500 bài giảng</p>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
          <div className="text-3xl mb-2">⭐</div>
          <h3 className="font-bold text-sm mb-1">Siêu bài giảng</h3>
          <p className="text-xs opacity-90">100k+ lượt xem</p>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
          <div className="text-3xl mb-2">💯</div>
          <h3 className="font-bold text-sm mb-1">100% Hoàn thành</h3>
          <p className="text-xs opacity-90">Tất cả bài tập</p>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
          <div className="text-3xl mb-2">🔥</div>
          <h3 className="font-bold text-sm mb-1">15 Ngày Streak</h3>
          <p className="text-xs opacity-90">Dạy liên tục</p>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
export default function StudentDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            Chào mừng trở lại! 👋
          </h1>
          <p className="text-gray-600">Hôm nay là Thứ Sáu, 24 tháng 10, 2025</p>
        </div>

        <QuickActions />
        <StatsOverview />

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <RecentClasses />
            <PerformanceChart />
          </div>

          <div className="space-y-8">
            <UpcomingTasks />
            <RecentActivity />
            <WeeklyGoals />
          </div>
        </div>

        <RecentContent />
        <Achievements />
      </div>
    </div>
  );
}