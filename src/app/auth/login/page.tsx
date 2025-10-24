import { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
    title: "Đăng nhập - LMS Học Sinh",
    description: "Đăng nhập vào hệ thống quản lý học tập trực tuyến",
};

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-400 to-pink-400 flex items-center justify-center p-5 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-[10%] left-[5%] text-8xl opacity-10 pointer-events-none animate-float-3d">
                📚
            </div>
            <div className="absolute bottom-[15%] right-[8%] text-[100px] opacity-10 pointer-events-none animate-float-3d">
                🌍
            </div>
            <div className="absolute top-[60%] left-[10%] text-6xl opacity-10 pointer-events-none animate-float-3d">
                ✏️
            </div>
            <div className="absolute top-[20%] right-[15%] text-7xl opacity-10 pointer-events-none animate-float-3d">
                📖
            </div>

            <LoginForm />
        </div>
    );
}
