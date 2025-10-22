﻿"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "../../hooks/use-toast";
import Button from "../ui/button";
import Input from "../ui/input";
import Label from "../ui/label";

function checkPasswordStrength(password: string) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
}

export default function RegisterForm() {
    const [fullname, setFullname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [terms, setTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const router = useRouter();
    const { toast } = useToast();

    const [pwStrength, setPwStrength] = useState(0);

    const onPasswordInput = (value: string) => {
        setPassword(value);
        setPwStrength(checkPasswordStrength(value));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!fullname || !email || !password || !confirmPassword) {
            toast({
                title: "⚠️ Vui lòng điền đầy đủ thông tin!",
                variant: "destructive",
            });
            return;
        }

        if (fullname.trim().length < 2) {
            toast({
                title: "⚠️ Họ tên phải có ít nhất 2 ký tự!",
                variant: "destructive",
            });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast({ title: "⚠️ Email không hợp lệ!", variant: "destructive" });
            return;
        }

        if (password.length < 6) {
            toast({
                title: "⚠️ Mật khẩu phải có ít nhất 6 ký tự!",
                variant: "destructive",
            });
            return;
        }

        if (password !== confirmPassword) {
            toast({
                title: "⚠️ Mật khẩu xác nhận không khớp!",
                variant: "destructive",
            });
            return;
        }

        if (!terms) {
            toast({
                title: "⚠️ Vui lòng đồng ý với điều khoản sử dụng!",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            // TODO: Gọi API đăng ký thật ở đây (fetch tới /api/auth/register) nếu có
            await new Promise((r) => setTimeout(r, 1200));

            toast({
                title: "🎉 Đăng ký thành công! Chào mừng bạn!",
                variant: "success",
            });
            // Chuyển về trang đăng nhập
            router.push("/auth/login");
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error("Register error:", err);
            toast({
                title: "❌ Có lỗi xảy ra",
                description: "Vui lòng thử lại sau.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-[440px] w-full animate-fade-in relative z-10">
            <div className="text-center mb-3">
                <div
                    className="text-6xl mb-4 inline-block animate-float"
                    role="img"
                    aria-label="Biểu tượng tạo tài khoản"
                >
                    ✨
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
                    Tạo tài khoản mới!
                </h1>
                <p className="text-sm text-gray-600">
                    Bắt đầu hành trình học tập thú vị ngay hôm nay
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Họ và tên */}
                <div>
                    <Label
                        htmlFor="fullname"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                        Họ và tên
                    </Label>
                    <div className="relative">
                        <span
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-xl"
                            aria-hidden
                        >
                            👤
                        </span>
                        <Input
                            id="fullname"
                            value={fullname}
                            onChange={(e) => setFullname(e.target.value)}
                            placeholder="Nhập họ và tên của bạn"
                            className="pl-12 h-12"
                            aria-label="Họ và tên"
                            required
                        />
                    </div>
                </div>

                {/* Email */}
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
                            aria-hidden
                        >
                            📧
                        </span>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Nhập email của bạn"
                            className="pl-12 h-12"
                            aria-label="Email"
                            required
                        />
                    </div>
                </div>

                {/* Mật khẩu */}
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
                            aria-hidden
                        >
                            🔒
                        </span>
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => onPasswordInput(e.target.value)}
                            placeholder="Tạo mật khẩu mạnh"
                            className="pl-12 pr-12 h-12"
                            aria-label="Mật khẩu"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-xl"
                            aria-label={
                                showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                            }
                        >
                            {showPassword ? "🙉" : "🙈"}
                        </button>
                    </div>

                    {/* Thanh đo mật khẩu */}
                    <div className="mt-2">
                        <div className="w-full h-2 bg-gray-100 rounded overflow-hidden mt-2">
                            <div
                                className={`h-full ${
                                    pwStrength <= 1
                                        ? "bg-red-400 w-1/3"
                                        : pwStrength === 2
                                        ? "bg-yellow-400 w-2/3"
                                        : "bg-green-400 w-full"
                                }`}
                            />
                        </div>
                        <div className="text-xs mt-1 text-gray-600">
                            {pwStrength <= 1
                                ? "🔴 Mật khẩu yếu"
                                : pwStrength === 2
                                ? "🟡 Mật khẩu trung bình"
                                : "🟢 Mật khẩu mạnh"}
                        </div>
                    </div>
                </div>

                {/* Xác nhận mật khẩu */}
                <div>
                    <Label
                        htmlFor="confirmPassword"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                        Xác nhận mật khẩu
                    </Label>
                    <div className="relative">
                        <span
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-xl"
                            aria-hidden
                        >
                            🔑
                        </span>
                        <Input
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Nhập lại mật khẩu"
                            className="pl-12 pr-12 h-12"
                            aria-label="Xác nhận mật khẩu"
                            required
                        />
                        <button
                            type="button"
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-xl"
                        ></button>
                    </div>
                </div>

                {/* Đồng ý điều khoản */}
                <div className="flex items-start gap-3">
                    <input
                        id="terms"
                        type="checkbox"
                        checked={terms}
                        onChange={(e) => setTerms(e.target.checked)}
                        className="w-5 h-5 mt-1 accent-pink-400"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-600">
                        Tôi đồng ý với{" "}
                        <a href="#" className="text-pink-400">
                            Điều khoản sử dụng
                        </a>{" "}
                        và{" "}
                        <a href="#" className="text-pink-400">
                            Chính sách bảo mật
                        </a>
                    </label>
                </div>

                {/* Nút đăng ký */}
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-pink-400 to-pink-600 text-white rounded-xl font-semibold shadow-lg"
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                            Đang đăng ký...
                        </span>
                    ) : (
                        "Đăng ký ngay 🚀"
                    )}
                </Button>
            </form>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-4 text-gray-500">hoặc</span>
                </div>
            </div>

            <div className="text-center text-sm text-gray-600">
                Đã có tài khoản?{" "}
                <Link
                    href="/auth/login"
                    className="text-blue-400 font-semibold"
                >
                    Đăng nhập! 🔐
                </Link>
            </div>
        </div>
    );
}
