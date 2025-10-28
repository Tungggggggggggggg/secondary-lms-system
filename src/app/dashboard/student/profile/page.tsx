// src/app/dashboard/student/profile/page.tsx
import { Button } from "@/components/ui/button";

export default function StudentProfilePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hồ sơ học sinh</h1>
          <p className="text-gray-600">Cập nhật thông tin cá nhân và bảo mật tài khoản</p>
        </div>
        <Button> Lưu thay đổi </Button>
      </div>

      {/* Thông tin cơ bản */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="border rounded-2xl p-6 text-center">
            <div className="w-28 h-28 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 mx-auto flex items-center justify-center text-3xl text-white font-bold">
              HS
            </div>
            <p className="mt-3 font-semibold">Nguyễn Văn A</p>
            <p className="text-sm text-gray-600">Học sinh • Lớp 8</p>
            <div className="mt-4">
              <Button variant="outline">Đổi ảnh đại diện</Button>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="border rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Họ và tên</label>
              <input className="mt-1 w-full border rounded-md px-3 py-2" defaultValue="Nguyễn Văn A" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input className="mt-1 w-full border rounded-md px-3 py-2" defaultValue="student@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                <input className="mt-1 w-full border rounded-md px-3 py-2" defaultValue="0901 234 567" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Ngày sinh</label>
                <input type="date" className="mt-1 w-full border rounded-md px-3 py-2" defaultValue="2012-01-01" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Địa chỉ</label>
                <input className="mt-1 w-full border rounded-md px-3 py-2" defaultValue="123 Đường ABC, Quận 1" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bảo mật tài khoản */}
      <div className="border rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Bảo mật tài khoản</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Mật khẩu hiện tại</label>
            <input type="password" className="mt-1 w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mật khẩu mới</label>
            <input type="password" className="mt-1 w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Xác nhận mật khẩu mới</label>
            <input type="password" className="mt-1 w-full border rounded-md px-3 py-2" />
          </div>
        </div>
        <div className="mt-4">
          <Button className="bg-green-600 hover:bg-green-700">Đổi mật khẩu</Button>
        </div>
      </div>
    </div>
  );
}


