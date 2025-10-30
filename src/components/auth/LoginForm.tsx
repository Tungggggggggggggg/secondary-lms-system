"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Label from "../ui/label";
import { signIn, getSession } from "next-auth/react";

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!email || !password) {
            toast({
                title: "⚠️ Vui lòng điền đầy đủ thông tin!",
                variant: "destructive",
            });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast({
                title: "⚠️ Email không hợp lệ!",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const result = await signIn("credentials", {
                redirect: false,
                email,
                password,
            });

            if (result?.error) {
                console.error("Login error", result.error);
                toast({
                    title: "❌ Đăng nhập thất bại!",
                    description:
                        result.error || "Email hoặc mật khẩu không đúng.",
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "🎉 Đăng nhập thành công!",
                description: "Chào mừng bạn đến với LMS!",
            });

            try {
                const justRegistered =
                    typeof window !== "undefined"
                        ? localStorage.getItem("justRegistered")
                        : null;
                if (justRegistered) {
                    localStorage.removeItem("justRegistered");
                    router.push("/auth/select-role");
                } else {
                    // Điều hướng theo vai trò
                    const session = await getSession();
                    const role = session?.user?.role?.toString().toUpperCase();
                    if (role === "TEACHER") {
                        router.push("/dashboard/teacher/dashboard");
                    } else if (role === "PARENT") {
                        router.push("/dashboard/parent/dashboard");
                    } else {
                        // Mặc định STUDENT
                        router.push("/dashboard/student/dashboard");
                    }
                }
            } catch (err) {
                console.warn(
                    "Redirect decision failed, defaulting to /dashboard",
                    err
                );
                router.push("/dashboard");
            }
        } catch (err: unknown) {
            console.error("Login error (client)", err);
            toast({
                title: "❌ Có lỗi xảy ra!",
                description: "Vui lòng thử lại sau.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-[440px] w-full animate-fade-in relative z-10">
            {/* Back to home button */}
            <div className="absolute top-4 left-4">
                <Link href="/" aria-label="Quay về trang chủ" tabIndex={-1}>
                    <button className="text-sm text-gray-500 hover:text-gray-700">
                        ← Trang chủ
                    </button>
                </Link>
            </div>

            {/* Logo Section */}
            <div className="text-center mb-1">
                <div
                    className="text-6xl mb-3 inline-block animate-float-3d"
                    role="img"
                    aria-label="Biểu tượng học tập"
                >
                    🎓
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-pink-400 bg-clip-text text-transparent mb-2">
                    Chào mừng đến với EduFun!
                </h1>
                <p className="text-sm text-gray-600">
                    Học tập thú vị cùng Lịch sử, Địa lý & Tiếng Anh
                </p>

                {/* Subject Tags */}
                <div className="flex gap-2 justify-center mt-4 flex-wrap">
                    <span className="bg-gradient-to-r from-blue-50 to-pink-50 px-3 py-1.5 rounded-full text-xs font-medium text-blue-900">
                        📜 Lịch sử
                    </span>
                    <span className="bg-gradient-to-r from-blue-50 to-pink-50 px-3 py-1.5 rounded-full text-xs font-medium text-blue-900">
                        🗺️ Địa lý
                    </span>
                    <span className="bg-gradient-to-r from-blue-50 to-pink-50 px-3 py-1.5 rounded-full text-xs font-medium text-blue-900">
                        🗣️ Tiếng Anh
                    </span>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div>
                    <Label
                        htmlFor="email"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                        Email
                    </Label>
                    <div className="relative">
                        <span
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-xl"
                            aria-hidden="true"
                        >
                            📧
                        </span>
                        <Input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Nhập email của bạn"
                            className="pl-12 h-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-blue-400 transition-all"
                            aria-label="Nhập địa chỉ email"
                            tabIndex={1}
                            required
                        />
                    </div>
                </div>

                {/* Password Field */}
                <div>
                    <Label
                        htmlFor="password"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                        Mật khẩu
                    </Label>
                    <div className="relative">
                        <span
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-xl"
                            aria-hidden="true"
                        >
                            🔒
                        </span>
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nhập mật khẩu"
                            className="pl-12 pr-12 h-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-blue-400 transition-all"
                            aria-label="Nhập mật khẩu"
                            tabIndex={2}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-xl hover:scale-110 transition-transform"
                            aria-label={
                                showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                            }
                        >
                            {showPassword ? "🙉" : "🙈"}
                        </button>
                    </div>
                </div>

                {/* Forgot Password */}
                <div className="text-right">
                    <Link
                        href="/auth/reset-password"
                        className="text-blue-400 hover:text-blue-600 font-medium hover:underline"
                        aria-label="Quên mật khẩu"
                    >
                        Quên mật khẩu? 🤔
                    </Link>
                </div>

                {/* Login Button */}
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                    aria-label="Đăng nhập vào hệ thống"
                    tabIndex={3}
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            Đang đăng nhập...
                        </span>
                    ) : (
                        "Đăng nhập 🚀"
                    )}
                </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-4 text-gray-500">hoặc</span>
                </div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center text-sm text-gray-600">
                Chưa có tài khoản?{" "}
                <Link
                    href="/auth/register"
                    className="text-pink-400 hover:text-pink-600 font-semibold hover:underline"
                    aria-label="Đăng ký tài khoản mới"
                >
                    Đăng ký ngay! ✨
                </Link>
            </div>
        </div>
    );
}
