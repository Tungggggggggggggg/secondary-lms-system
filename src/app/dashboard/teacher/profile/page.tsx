"use client";

import ProfileForm from "@/components/teacher/profile/ProfileForm";
import ProfileStats from "@/components/teacher/profile/ProfileStats";

export default function ProfilePage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Hồ sơ của tôi</h1>
        <p className="text-gray-600">Quản lý thông tin cá nhân và thống kê</p>
      </div>

      {/* Profile Form */}
      <div className="mb-8">
        <ProfileForm />
      </div>

      {/* Statistics & Achievements */}
      <ProfileStats />

      {/* Account Settings */}
      <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Cài đặt tài khoản</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <div className="font-semibold text-gray-800">Đổi mật khẩu</div>
              <div className="text-sm text-gray-600">Cập nhật mật khẩu mới cho tài khoản</div>
            </div>
            <button className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all">
              Thay đổi →
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <div className="font-semibold text-gray-800">Thông báo</div>
              <div className="text-sm text-gray-600">Cài đặt thông báo và cập nhật</div>
            </div>
            <button className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all">
              Cài đặt →
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <div className="font-semibold text-gray-800">Bảo mật</div>
              <div className="text-sm text-gray-600">Xác thực hai yếu tố và kiểm tra bảo mật</div>
            </div>
            <button className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all">
              Kiểm tra →
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
            <div>
              <div className="font-semibold text-red-800">Xóa tài khoản</div>
              <div className="text-sm text-red-600">Xóa vĩnh viễn tài khoản và dữ liệu</div>
            </div>
            <button className="px-4 py-2 text-red-600 hover:bg-red-100 rounded-xl transition-all">
              Xóa →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
