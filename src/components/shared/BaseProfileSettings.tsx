"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Label from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "@/components/ui/button";
import type { InputProps } from "@/components/ui/input";

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Vui lòng thử lại";
      toast({ title: "❌ Lỗi", description: message, variant: "destructive" });
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Vui lòng thử lại";
      toast({ title: "❌ Lỗi", description: message, variant: "destructive" });
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
    parent: "from-amber-400 to-orange-500",
  };

  const roleColors: Record<
    ProfileRole,
    {
      card: string;
      border: string;
      title: string;
      label: string;
      input: NonNullable<InputProps["color"]>;
      button: NonNullable<ButtonProps["color"]>;
    }
  > = {
    teacher: {
      card: "bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border-blue-100 hover:border-blue-200",
      border: "border-blue-200/50",
      title: "text-blue-900",
      label: "text-blue-700",
      input: "blue",
      button: "blue",
    },
    student: {
      card: "bg-gradient-to-br from-green-50/50 to-emerald-50/30 border-green-100 hover:border-green-200",
      border: "border-green-200/50",
      title: "text-green-900",
      label: "text-green-700",
      input: "green",
      button: "green",
    },
    parent: {
      card: "bg-gradient-to-br from-amber-50/50 to-orange-50/30 border-amber-100 hover:border-amber-200",
      border: "border-amber-200/50",
      title: "text-amber-900",
      label: "text-amber-700",
      input: "amber",
      button: "amber",
    },
  };

  const colors = roleColors[role];

  return (
    <div className="space-y-6">
      {/* Profile Form Card */}
      <div className={`${colors.card} border rounded-2xl p-6 hover:shadow-lg transition-all duration-300 group`}>
        {role === "teacher" && (
          <div className="flex items-center gap-6 mb-6">
            <div
              className={`w-24 h-24 bg-gradient-to-br ${roleAvatarGradients[role]} rounded-2xl flex items-center justify-center text-4xl text-white font-bold group-hover:scale-110 transition-transform duration-300`}
            >
              {initial}
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${colors.title}`}>{displayName}</h2>
              <p className={colors.label}>{roleSubtitle}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="fullname" className={`${colors.label} font-semibold`}>Họ và tên</Label>
              <Input
                id="fullname"
                type="text"
                value={profile.fullname}
                onChange={(e) => setProfile({ ...profile, fullname: e.target.value })}
                color={colors.input}
                required
              />
            </div>
            <div>
              <Label htmlFor="email" className={`${colors.label} font-semibold`}>Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                color={colors.input}
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSavingProfile} color={colors.button}>
              {isSavingProfile ? "Đang cập nhật..." : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </div>

      {/* Password Form Card */}
      <div className={`${colors.card} border rounded-2xl p-6 hover:shadow-lg transition-all duration-300`}>
        <h2 className={`text-xl font-bold ${colors.title} mb-5`}>Đổi mật khẩu</h2>
        <form onSubmit={handleChangePassword} className="space-y-5">
          <div>
            <Label htmlFor="currentPassword" className={`${colors.label} font-semibold`}>Mật khẩu hiện tại</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              color={colors.input}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="newPassword" className={`${colors.label} font-semibold`}>Mật khẩu mới</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                color={colors.input}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" className={`${colors.label} font-semibold`}>Xác nhận mật khẩu mới</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) =>
                  setPasswords({ ...passwords, confirmPassword: e.target.value })
                }
                color={colors.input}
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isChangingPassword} color={colors.button}>
              {isChangingPassword ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
