'use client';

import { Button } from '@/components/ui/button';

export default function Hero() {
    return (
        <section id="home" className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent relative overflow-hidden flex items-center pt-20">
            {/* Background Circles */}
            <div className="hero-bg absolute inset-0">
                <div className="hero-circle circle-1 w-[400px] h-[400px] bg-white/10 rounded-full absolute -top-[200px] -right-[100px] animate-float" />
                <div className="hero-circle circle-2 w-[300px] h-[300px] bg-white/10 rounded-full absolute -bottom-[150px] -left-[100px] animate-float-delay" />
                <div className="hero-circle circle-3 w-[200px] h-[200px] bg-white/10 rounded-full absolute top-1/2 right-[20%] animate-float-slow" />
            </div>

            <div className="hero-container max-w-[1400px] mx-auto px-10 py-20 grid lg:grid-cols-2 gap-20 items-center relative z-[1]">
                {/* Hero Content */}
                <div className="hero-content text-white">
                    <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6">
                        Học tập <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">thông minh</span>, tương lai rực rỡ ✨
                    </h1>
                    <p className="text-lg md:text-xl text-white/95 mb-10 leading-relaxed">
                        Nền tảng học trực tuyến hiện đại dành cho học sinh THCS. Khám phá Lịch sử, Địa lý và Tiếng Anh một cách thú vị và hiệu quả!
                    </p>
                    
                    <div className="hero-cta flex flex-col sm:flex-row gap-5">
                        <Button 
                            size="lg"
                            className="bg-white text-primary hover:bg-white/90 hover:scale-105 transition-transform text-lg px-10 py-6 rounded-xl shadow-lg"
                        >
                            Bắt đầu học ngay 🚀
                        </Button>
                        <Button 
                            size="lg"
                            variant="outline"
                            className="border-2 border-white text-white hover:bg-white hover:text-primary transition-all text-lg px-10 py-6 rounded-xl"
                        >
                            Tìm hiểu thêm
                        </Button>
                    </div>

                    <div className="hero-stats grid grid-cols-1 sm:grid-cols-3 gap-8 mt-16">
                        <div className="stat-item text-center p-5 bg-white/15 backdrop-blur-md rounded-2xl border-2 border-white/20">
                            <span className="text-3xl font-extrabold block mb-2">5,000+</span>
                            <span className="text-sm text-white/90 font-medium">Học sinh</span>
                        </div>
                        <div className="stat-item text-center p-5 bg-white/15 backdrop-blur-md rounded-2xl border-2 border-white/20">
                            <span className="text-3xl font-extrabold block mb-2">500+</span>
                            <span className="text-sm text-white/90 font-medium">Giáo viên</span>
                        </div>
                        <div className="stat-item text-center p-5 bg-white/15 backdrop-blur-md rounded-2xl border-2 border-white/20">
                            <span className="text-3xl font-extrabold block mb-2">1,200+</span>
                            <span className="text-sm text-white/90 font-medium">Bài giảng</span>
                        </div>
                    </div>
                </div>

                {/* Hero Visual */}
                <div className="hero-visual relative">
                    <div className="hero-mockup w-full max-w-[600px] mx-auto relative animate-float-slow">
                        <div className="mockup-card bg-white rounded-3xl p-10 shadow-2xl">
                            <div className="mockup-header flex items-center gap-4 mb-6">
                                <div className="mockup-icon w-[60px] h-[60px] bg-gradient-to-r from-primary to-secondary rounded-2xl flex items-center justify-center text-3xl">
                                    📊
                                </div>
                                <div>
                                    <div className="mockup-title text-xl font-bold text-gray-800">Tiến độ học tập</div>
                                    <div className="text-sm text-gray-500">Tuần này</div>
                                </div>
                            </div>
                            
                            <div className="progress-bars flex flex-col gap-5">
                                <div className="progress-item">
                                    <div className="progress-label flex justify-between text-sm font-semibold text-gray-600 mb-2">
                                        <span>📜 Lịch sử</span>
                                        <span>85%</span>
                                    </div>
                                    <div className="progress-bar h-3 bg-gray-100 rounded-lg overflow-hidden">
                                        <div className="progress-fill h-full w-[85%] bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg transition-all duration-1000" />
                                    </div>
                                </div>

                                <div className="progress-item">
                                    <div className="progress-label flex justify-between text-sm font-semibold text-gray-600 mb-2">
                                        <span>🗺️ Địa lý</span>
                                        <span>72%</span>
                                    </div>
                                    <div className="progress-bar h-3 bg-gray-100 rounded-lg overflow-hidden">
                                        <div className="progress-fill h-full w-[72%] bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-lg transition-all duration-1000" />
                                    </div>
                                </div>

                                <div className="progress-item">
                                    <div className="progress-label flex justify-between text-sm font-semibold text-gray-600 mb-2">
                                        <span>🗣️ Tiếng Anh</span>
                                        <span>90%</span>
                                    </div>
                                    <div className="progress-bar h-3 bg-gray-100 rounded-lg overflow-hidden">
                                        <div className="progress-fill h-full w-[90%] bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg transition-all duration-1000" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Cards */}
                        <div className="floating-card floating-card-1 absolute -top-5 -right-10 bg-white rounded-2xl p-4 shadow-lg flex items-center gap-3">
                            <div className="floating-icon w-12 h-12 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-xl flex items-center justify-center text-2xl">
                                🏆
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Thành tích mới</div>
                                <div className="text-sm font-bold text-gray-800">+50 điểm</div>
                            </div>
                        </div>

                        <div className="floating-card floating-card-2 absolute bottom-10 -left-16 bg-white rounded-2xl p-4 shadow-lg flex items-center gap-3">
                            <div className="floating-icon w-12 h-12 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center text-2xl">
                                🔥
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Streak</div>
                                <div className="text-sm font-bold text-gray-800">7 ngày</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}