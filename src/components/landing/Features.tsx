'use client';

export default function Features() {
    const features = [
        {
            icon: '📚',
            title: 'Học tự do & Học trong lớp',
            description: 'Linh hoạt giữa học tự do với hàng nghìn bài giảng công khai và học trong lớp với giáo viên hướng dẫn. Phù hợp mọi phong cách học tập.'
        },
        {
            icon: '🎯',
            title: 'Theo dõi tiến độ chi tiết',
            description: 'Dashboard trực quan hiển thị tiến độ học tập, điểm số, thành tích và các mục tiêu cần đạt. Học sinh và phụ huynh cùng theo dõi.'
        },
        {
            icon: '✍️',
            title: 'Bài tập & Kiểm tra trực tuyến',
            description: 'Làm bài tập, kiểm tra trực tuyến với nhiều dạng câu hỏi đa dạng. Tự động chấm điểm và nhận phản hồi ngay lập tức.'
        },
        {
            icon: '👥',
            title: 'Quản lý lớp học thông minh',
            description: 'Giáo viên dễ dàng tạo lớp, gán bài tập, chấm điểm và theo dõi học sinh. Tham gia lớp chỉ với một mã đơn giản.'
        },
        {
            icon: '📊',
            title: 'Báo cáo & Thống kê',
            description: 'Phân tích chi tiết kết quả học tập với biểu đồ trực quan. Giúp giáo viên và phụ huynh nắm rõ điểm mạnh, điểm yếu của học sinh.'
        },
        {
            icon: '🏆',
            title: 'Gamification & Thành tích',
            description: 'Kiếm điểm, huy hiệu và leo bảng xếp hạng. Học tập trở nên thú vị hơn với hệ thống thử thách và phần thưởng hấp dẫn.'
        },
        {
            icon: '💬',
            title: 'Thảo luận & Tương tác',
            description: 'Trao đổi với giáo viên và bạn học trong diễn đàn lớp học. Đặt câu hỏi, chia sẻ kiến thức và học hỏi lẫn nhau.'
        },
        {
            icon: '🔔',
            title: 'Thông báo thông minh',
            description: 'Nhận thông báo về bài tập mới, deadline, kết quả kiểm tra và tin nhắn từ giáo viên. Không bỏ lỡ điều quan trọng nào.'
        }
    ];

    return (
        <section id="features" className="py-32 bg-white">
            <div className="max-w-[1400px] mx-auto px-10">
                <div className="text-center mb-20">
                    <span className="inline-block px-6 py-2.5 bg-gradient-to-r from-purple-100 to-purple-200 text-primary font-semibold text-sm rounded-full mb-5">
                        ✨ Tính năng nổi bật
                    </span>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-5">
                        Học tập hiện đại, hiệu quả tối ưu
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Trải nghiệm học tập toàn diện với công nghệ tiên tiến và phương pháp giảng dạy sáng tạo
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-16 md:gap-20">
                    {features.map((feature, index) => (
                        <div key={index} className="feature-item flex gap-6">
                            <div className="flex-shrink-0">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-2xl shadow-lg shadow-primary/30">
                                    {feature.icon}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}