'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Footer() {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);

    const handleSubscribe = () => {
        if (email) {
            setSubscribed(true);
            setTimeout(() => {
                setSubscribed(false);
                setEmail('');
            }, 3000);
        }
    };

    const footerLinks = {
        product: [
            { label: 'Khóa học', href: '#', icon: '📚' },
            { label: 'Thư viện', href: '#', icon: '📖' },
            { label: 'Lớp học', href: '#', icon: '🎓' },
            { label: 'Bài tập', href: '#', icon: '✍️' }
        ],
        support: [
            { label: 'Trung tâm trợ giúp', href: '#', icon: '💬' },
            { label: 'Hướng dẫn sử dụng', href: '#', icon: '📘' },
            { label: 'Liên hệ', href: '#', icon: '📧' },
            { label: 'FAQ', href: '#', icon: '❓' }
        ],
        company: [
            { label: 'Giới thiệu', href: '#', icon: '🏢' },
            { label: 'Blog', href: '#', icon: '✍️' },
            { label: 'Tuyển dụng', href: '#', icon: '👥' },
            { label: 'Chính sách', href: '#', icon: '🔒' }
        ],
        social: [
            { label: 'Facebook', icon: '📘', href: '#', color: 'hover:bg-blue-600' },
            { label: 'Instagram', icon: '📷', href: '#', color: 'hover:bg-pink-600' },
            { label: 'Twitter', icon: '🐦', href: '#', color: 'hover:bg-sky-500' },
            { label: 'YouTube', icon: '📺', href: '#', color: 'hover:bg-red-600' }
        ]
    };

    return (
        <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-10 right-10 w-64 h-64 bg-primary rounded-full blur-3xl"></div>
                <div className="absolute bottom-10 left-10 w-64 h-64 bg-secondary rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-8">
                {/* Newsletter Section */}
                <div className="bg-gradient-to-r from-primary to-secondary rounded-3xl p-10 mb-16 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16"></div>
                    
                    <div className="relative z-10 max-w-2xl mx-auto text-center">
                        <h3 className="text-3xl font-bold text-white mb-3">
                            🎉 Nhận tin tức mới nhất
                        </h3>
                        <p className="text-white/90 mb-6 text-lg">
                            Đăng ký để nhận thông tin về khóa học mới, tips học tập và ưu đãi đặc biệt!
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email của bạn..."
                                className="flex-1 px-6 py-4 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-white/30 transition-all"
                            />
                            <button
                                onClick={handleSubscribe}
                                className="px-8 py-4 bg-white text-primary font-bold rounded-xl hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all shadow-lg"
                            >
                                {subscribed ? '✓ Đã đăng ký!' : 'Đăng ký'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Footer Content */}
                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
                    {/* Brand Column */}
                    <div className="lg:col-span-2">
                        <Link href="/" className="inline-flex items-center gap-3 text-3xl font-extrabold mb-4">
                            <span className="text-4xl">🎓</span>
                            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                EduVerse
                            </span>
                        </Link>
                        <p className="text-gray-400 mb-6 leading-relaxed text-lg">
                            Nền tảng học trực tuyến hiện đại dành cho học sinh THCS. 
                            Học tập thông minh, tương lai rực rỡ ✨
                        </p>
                        
                        {/* Social Links */}
                        <div className="flex gap-3">
                            {footerLinks.social.map((social, index) => (
                                <Link
                                    key={index}
                                    href={social.href}
                                    className={`w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-xl hover:bg-primary ${social.color} transform hover:-translate-y-1 hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-xl`}
                                    title={social.label}
                                >
                                    {social.icon}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Product Links */}
                    <div>
                        <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="text-2xl">🎯</span>
                            Sản phẩm
                        </h4>
                        <ul className="space-y-3">
                            {footerLinks.product.map((link, index) => (
                                <li key={index}>
                                    <Link 
                                        href={link.href} 
                                        className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <span className="text-lg group-hover:scale-125 transition-transform inline-block">
                                            {link.icon}
                                        </span>
                                        <span className="group-hover:translate-x-1 transition-transform inline-block">
                                            {link.label}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Support Links */}
                    <div>
                        <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="text-2xl">💡</span>
                            Hỗ trợ
                        </h4>
                        <ul className="space-y-3">
                            {footerLinks.support.map((link, index) => (
                                <li key={index}>
                                    <Link 
                                        href={link.href} 
                                        className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <span className="text-lg group-hover:scale-125 transition-transform inline-block">
                                            {link.icon}
                                        </span>
                                        <span className="group-hover:translate-x-1 transition-transform inline-block">
                                            {link.label}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="text-2xl">🏆</span>
                            Về chúng tôi
                        </h4>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link, index) => (
                                <li key={index}>
                                    <Link 
                                        href={link.href} 
                                        className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <span className="text-lg group-hover:scale-125 transition-transform inline-block">
                                            {link.icon}
                                        </span>
                                        <span className="group-hover:translate-x-1 transition-transform inline-block">
                                            {link.label}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-gray-800">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-gray-400 text-center md:text-left">
                            © 2025 EduVerse. All rights reserved. Made with <span className="text-red-500 animate-pulse">❤️</span> for students.
                        </p>
                        <div className="flex gap-6 text-sm">
                            <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                                Điều khoản
                            </Link>
                            <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                                Bảo mật
                            </Link>
                            <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                                Cookies
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll to Top Button */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center text-2xl text-white shadow-2xl hover:scale-110 hover:rotate-12 transition-all duration-300 z-50"
                aria-label="Scroll to top"
            >
                ⬆️
            </button>
        </footer>
    );
}