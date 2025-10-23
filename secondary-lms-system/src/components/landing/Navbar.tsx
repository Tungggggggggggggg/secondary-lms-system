'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Navbar() {
    return (
        <nav id="navbar" className="fixed top-0 w-full bg-white/95 backdrop-blur-md z-[1000] shadow-sm transition-all duration-300">
            <div className="max-w-[1400px] mx-auto flex justify-between items-center px-10 py-5">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 text-2xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    <span className="text-3xl">🎓</span>
                    <span>EduVerse</span>
                </Link>
                
                {/* Navigation Links - Hidden on mobile */}
                <ul className="hidden md:flex gap-10 items-center">
                    <li><Link href="#home" className="text-gray-700 font-semibold text-sm hover:text-primary transition-colors">Trang chủ</Link></li>
                    <li><Link href="#subjects" className="text-gray-700 font-semibold text-sm hover:text-primary transition-colors">Môn học</Link></li>
                    <li><Link href="#features" className="text-gray-700 font-semibold text-sm hover:text-primary transition-colors">Tính năng</Link></li>
                    <li><Link href="#roles" className="text-gray-700 font-semibold text-sm hover:text-primary transition-colors">Vai trò</Link></li>
                </ul>

                {/* CTA Buttons - Hidden on mobile */}
                <div className="hidden md:flex items-center gap-4">
                    <Button 
                        variant="outline"
                        className="text-primary border-primary hover:bg-primary hover:text-white transition-all"
                    >
                        Đăng nhập
                    </Button>
                    <Button 
                        className="bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
                    >
                        Đăng ký ngay
                    </Button>
                </div>

                {/* Mobile Menu Button */}
                <button className="mobile-menu-btn md:hidden text-2xl text-primary">
                    ☰
                </button>

                {/* Mobile Navigation Menu - Hidden by default */}
                <div className="nav-links hidden absolute top-20 left-0 right-0 bg-white flex-col items-center py-5 shadow-lg md:hidden">
                    <Link href="#home" className="w-full text-center py-3 text-gray-700 font-semibold hover:bg-gray-50">
                        Trang chủ
                    </Link>
                    <Link href="#subjects" className="w-full text-center py-3 text-gray-700 font-semibold hover:bg-gray-50">
                        Môn học
                    </Link>
                    <Link href="#features" className="w-full text-center py-3 text-gray-700 font-semibold hover:bg-gray-50">
                        Tính năng
                    </Link>
                    <Link href="#roles" className="w-full text-center py-3 text-gray-700 font-semibold hover:bg-gray-50">
                        Vai trò
                    </Link>
                </div>

                {/* Mobile CTA Buttons - Hidden by default */}
                <div className="nav-cta hidden absolute top-[calc(100%+160px)] left-5 right-5 flex-col gap-3 px-5 md:hidden">
                    <Button 
                        variant="outline" 
                        className="w-full text-primary border-primary hover:bg-primary hover:text-white"
                    >
                        Đăng nhập
                    </Button>
                    <Button 
                        className="w-full bg-gradient-to-r from-primary to-secondary text-white"
                    >
                        Đăng ký ngay
                    </Button>
                </div>
            </div>
        </nav>
    );
}