'use client';

import { Button } from '@/components/ui/button';

export default function CTA() {
    return (
        <section className="py-32 bg-gray-50">
            <div className="max-w-[1000px] mx-auto px-10">
                <div className="bg-gradient-to-r from-primary to-secondary rounded-[32px] p-16 md:p-20 text-center relative overflow-hidden">
                    {/* Large Emoji Background */}
                    <div 
                        className="absolute -top-12 -right-12 text-[200px] opacity-10 animate-float"
                        aria-hidden="true"
                    >
                        🎓
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-[1]">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-5">
                            Sẵn sàng bắt đầu hành trình học tập?
                        </h2>
                        <p className="text-lg md:text-xl text-white/95 mb-10 leading-relaxed">
                            Tham gia cùng hàng nghìn học sinh, giáo viên và phụ huynh đang sử dụng EduVerse mỗi ngày!
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                            <Button 
                                size="lg"
                                className="bg-white text-primary hover:bg-white/90 hover:scale-105 transition-transform text-lg px-10 py-6 rounded-xl shadow-lg w-full sm:w-auto"
                            >
                                Đăng ký miễn phí 🚀
                            </Button>
                            <Button 
                                size="lg"
                                variant="outline"
                                className="border-2 border-white text-white hover:bg-white hover:text-primary transition-all text-lg px-10 py-6 rounded-xl w-full sm:w-auto"
                            >
                                Xem Demo
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}