'use client';

export default function Roles() {
    const roles = [
        {
            icon: '👨‍🎓',
            title: 'Học sinh',
            description: 'Học tập tự do hoặc tham gia lớp với giáo viên. Theo dõi tiến độ, làm bài tập và nhận điểm trực tuyến.'
        },
        {
            icon: '👨‍🏫',
            title: 'Giáo viên',
            description: 'Tạo và quản lý nội dung, lớp học. Gán bài tập, chấm điểm và theo dõi tiến độ học sinh dễ dàng.'
        },
        {
            icon: '👨‍👩‍👧',
            title: 'Phụ huynh',
            description: 'Theo dõi kết quả học tập của con em. Nhận báo cáo định kỳ và liên lạc trực tiếp với giáo viên.'
        }
    ];

    return (
        <section id="roles" className="py-32 bg-gradient-to-br from-primary to-secondary relative overflow-hidden">
            {/* Dotted Pattern Background */}
            <div 
                className="absolute inset-0 opacity-30"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='2' fill='white' opacity='0.1'/%3E%3C/svg%3E")`,
                    opacity: 0.3
                }}
            />

            <div className="max-w-[1400px] mx-auto px-10 relative z-[1]">
                <div className="text-center mb-20">
                    <span className="inline-block px-6 py-2.5 bg-white/20 text-white font-semibold text-sm rounded-full mb-5">
                        🎭 Dành cho mọi người
                    </span>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-5">
                        Trải nghiệm phù hợp với từng vai trò
                    </h2>
                    <p className="text-lg text-white/90 max-w-2xl mx-auto">
                        Mỗi người dùng đều có giao diện và tính năng được tối ưu riêng
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {roles.map((role, index) => (
                        <div 
                            key={index} 
                            className="role-card bg-white rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl"
                        >
                            <div className="text-6xl mb-5 inline-block animate-bounce">
                                {role.icon}
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-3">
                                {role.title}
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                {role.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}