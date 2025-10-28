'use client';

import { useRouter } from 'next/navigation';

export default function QuickActions() {
    const router = useRouter();
    const actions = [
      { 
        icon: "📝", 
        title: "Tạo bài giảng", 
        desc: "Thêm nội dung mới",
        href: "/dashboard/teacher/lessons/new"
      },
      { 
        icon: "🏫", 
        title: "Tạo lớp học", 
        desc: "Mở lớp mới",
        href: "/dashboard/teacher/classroom/new"
      },
      { 
        icon: "✍️", 
        title: "Giao bài tập", 
        desc: "Tạo assignment",
        href: "/dashboard/teacher/assignments/new"
      },
      { 
        icon: "📊", 
        title: "Xem báo cáo", 
        desc: "Phân tích dữ liệu",
        href: "/dashboard/teacher/reports"
      },
    ];
  
    return (
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {actions.map((item, index) => (
          <button
            key={index}
            onClick={() => router.push(item.href)}
            className="gradient-border rounded-2xl p-6 text-center hover-lift group"
          >
            <div className="text-5xl mb-3 animate-float-3d">{item.icon}</div>
            <h3 className="font-bold text-gray-800 mb-2">{item.title}</h3>
            <p className="text-sm text-gray-600">{item.desc}</p>
          </button>
        ))}
      </div>
    );
  }