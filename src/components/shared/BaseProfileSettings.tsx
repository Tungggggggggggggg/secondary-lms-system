"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Label from "@/components/ui/label";

export type ProfileRole = "teacher" | "student" | "parent";

interface BaseProfileSettingsProps {
  role: ProfileRole;
}

interface ProfileState {
  fullname: string;
  email: string;
}

interface PasswordState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function BaseProfileSettings({ role }: BaseProfileSettingsProps) {
  const { data: session, update } = useSession();
  const { toast } = useToast();

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [profile, setProfile] = useState<ProfileState>({
    fullname: "",
    email: "",
  });

  const [passwords, setPasswords] = useState<PasswordState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (session?.user) {
      const userAny = session.user as { fullname?: string; name?: string; email?: string };
      setProfile({
        fullname: userAny?.fullname || userAny?.name || "",
        email: userAny?.email || "",
      });
    }
  }, [session]);

  const handleSaveProfile = async (e: FormEvent) => {
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
      toast({ title: "❌ Lỗi", description: err?.message || "Vui lòng thử lại", variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      toast({ title: "⚠️ Vui lòng điền đầy đủ thông tin!", variant: "destructive" });
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: "⚠️ Mật khẩu xác nhận không khớp!", variant: "destructive" });
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast({ title: "⚠️ Mật khẩu phải có ít nhất 6 ký tự!", variant: "destructive" });
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
      toast({ title: "❌ Lỗi", description: err?.message || "Vui lòng thử lại", variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const fallbackName =
    role === "teacher" ? "Giáo viên" : role === "student" ? "Học sinh" : "Phụ huynh";
  const displayName = profile.fullname || fallbackName;
  const initial = (profile.fullname || fallbackName).charAt(0).toUpperCase();
  const roleSubtitle =
    role === "teacher" ? "Giáo viên THCS" : role === "student" ? "Học sinh" : "Phụ huynh";

  const roleAvatarGradients: Record<ProfileRole, string> = {
    teacher: "from-purple-500 to-indigo-500",
    student: "from-emerald-500 to-sky-500",
    parent: "from-orange-500 to-pink-500",
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-2xl p-6">
        {role === "teacher" && (
          <div className="flex items-center gap-6 mb-6">
            <div
              className={`w-24 h-24 bg-gradient-to-br ${roleAvatarGradients[role]} rounded-2xl flex items-center justify-center text-4xl text-white font-bold`}
            >
              {initial}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{displayName}</h2>
              <p className="text-gray-600">{roleSubtitle}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="fullname">Họ và tên</Label>
              <Input
                id="fullname"
                type="text"
                value={profile.fullname}
                onChange={(e) => setProfile({ ...profile, fullname: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? "Đang cập nhật..." : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white border rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-4">Đổi mật khẩu</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) =>
                  setPasswords({ ...passwords, confirmPassword: e.target.value })
                }
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isChangingPassword}>
              {isChangingPassword ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
