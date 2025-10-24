import { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
    title: "Đăng ký - LMS Học Sinh",
    description: "Tạo tài khoản để bắt đầu học tập trên LMS",
};

export default function RegisterPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-400 to-blue-400 flex items-center justify-center p-5 relative overflow-hidden">
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

            <RegisterForm />
        </div>
    );
}
