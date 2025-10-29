"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ProfileForm() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "Nguyễn Văn A",
    email: "teacher@example.com",
    phone: "0123456789",
    subjects: ["Lịch sử", "Địa lý"],
    bio: "Giáo viên với hơn 10 năm kinh nghiệm giảng dạy tại các trường THCS.",
    expertise: "Chuyên môn về Lịch sử - Địa lý, đặc biệt là phương pháp giảng dạy tương tác.",
    avatar: "A"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement profile update
    toast({
      title: "Thành công!",
      description: "Thông tin hồ sơ đã được cập nhật",
      variant: "success",
    });
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center text-4xl text-white font-bold">
            {formData.avatar}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{formData.fullName}</h2>
            <p className="text-gray-600">Giáo viên THCS</p>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
        >
          {isEditing ? "Hủy" : "Chỉnh sửa hồ sơ"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Họ và tên
            </label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Email
            </label>
            <input
              type="email"
              disabled={!isEditing}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Số điện thoại
            </label>
            <input
              type="tel"
              disabled={!isEditing}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Môn giảng dạy
            </label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.subjects.join(", ")}
              onChange={(e) => setFormData({ ...formData, subjects: e.target.value.split(", ") })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 disabled:bg-gray-50"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Giới thiệu
          </label>
          <textarea
            disabled={!isEditing}
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 disabled:bg-gray-50 resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Chuyên môn
          </label>
          <textarea
            disabled={!isEditing}
            value={formData.expertise}
            onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 disabled:bg-gray-50 resize-none"
          />
        </div>

        {isEditing && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
            >
              Lưu thay đổi
            </button>
          </div>
        )}
      </form>
    </div>
  );
}