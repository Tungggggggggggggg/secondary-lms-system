"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Label from "@/components/ui/label";

export default function ParentProfileForm() {
  const { data: session, update } = useSession();
  const { toast } = useToast();

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [profile, setProfile] = useState({
    fullname: "",
    email: "",
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (session?.user) {
      setProfile({
        fullname: (session.user as any)?.fullname || session.user.name || "",
        email: session.user.email || "",
      });
    }
  }, [session]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile.fullname || !profile.email) {
      toast({ title: "⚠️ Vui lòng điền đầy đủ thông tin!", variant: "destructive" });
      return;
    }
    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullname: profile.fullname, email: profile.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Cập nhật thất bại");

      await update?.();
      toast({ title: "✅ Đã lưu", description: "Thông tin hồ sơ đã được cập nhật" });
    } catch (err: any) {
      toast({ title: "❌ Lỗi", description: err.message || "Vui lòng thử lại", variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      toast({ title: "⚠️ Vui lòng điền đầy đủ thông tin!", variant: "destructive" });
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: "⚠️ Mật khẩu xác nhận không khớp!", variant: "destructive" });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/users/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Đổi mật khẩu thất bại");

      toast({ title: "✅ Đã đổi mật khẩu" });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast({ title: "❌ Lỗi", description: err.message || "Vui lòng thử lại", variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  }

  const initial = (profile.fullname || "").charAt(0).toUpperCase() || "P";

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-2xl p-6">
       

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <Label htmlFor="fullname" className="text-sm font-medium text-gray-700">Họ và tên</Label>
            <Input
              id="fullname"
              value={profile.fullname}
              onChange={(e) => setProfile({ ...profile, fullname: e.target.value })}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="mt-1"
              required
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSavingProfile}>{isSavingProfile ? "Đang cập nhật..." : "Lưu thay đổi"}</Button>
          </div>
        </form>
      </div>

      <div className="bg-white border rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-4">Đổi mật khẩu</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">Mật khẩu hiện tại</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              className="mt-1"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">Mật khẩu mới</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Xác nhận mật khẩu mới</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                className="mt-1"
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isChangingPassword}>{isChangingPassword ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}


