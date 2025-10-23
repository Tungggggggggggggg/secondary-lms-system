'use client';

export default function Subjects() {
    const subjects = [
        {
            icon: '📜',
            title: 'Lịch sử',
            description: 'Khám phá quá khứ, hiểu hiện tại và định hình tương lai. Hành trình xuyên suốt các thời kỳ lịch sử Việt Nam và thế giới.',
            features: [
                'Timeline tương tác sinh động',
                'Video tái hiện sự kiện lịch sử',
                'Bài tập trắc nghiệm thú vị',
                'Bản đồ lịch sử 3D',
            ],
            colorClass: 'from-yellow-500 to-yellow-600'
        },
        {
            icon: '🗺️',
            title: 'Địa lý',
            description: 'Khám phá hành tinh tuyệt vời của chúng ta. Từ địa hình, khí hậu đến văn hóa và kinh tế các quốc gia.',
            features: [
                'Bản đồ tương tác 3D',
                'Hình ảnh vệ tinh thực tế',
                'Video thực địa đa dạng',
                'Trò chơi khám phá thế giới',
            ],
            colorClass: 'from-emerald-500 to-emerald-600'
        },
        {
            icon: '🗣️',
            title: 'Tiếng Anh',
            description: 'Chinh phục ngôn ngữ toàn cầu với phương pháp học hiện đại. Giao tiếp tự tin và đạt điểm cao.',
            features: [
                'Luyện phát âm chuẩn với AI',
                'Từ vựng hình ảnh sinh động',
                'Video bài học thực tế',
                'Game học từ vựng hấp dẫn',
            ],
            colorClass: 'from-blue-500 to-blue-600'
        }
    ];

    return (
        <section id="subjects" className="py-32 bg-gray-50 relative">
            <div className="max-w-[1400px] mx-auto px-10">
                <div className="text-center mb-20">
                    <span className="inline-block px-6 py-2.5 bg-gradient-to-r from-purple-100 to-purple-200 text-primary font-semibold text-sm rounded-full mb-5">
                        📚 Ba môn học chính
                    </span>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-5">
                        Khám phá thế giới kiến thức
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Học tập hiệu quả với nội dung phong phú, sinh động và được thiết kế đặc biệt cho học sinh THCS
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-10">
                    {subjects.map((subject, index) => (
                        <div 
                            key={index} 
                            className="subject-card bg-white rounded-3xl p-10 transition-all duration-300 cursor-pointer hover:-translate-y-2 hover:shadow-2xl group relative overflow-hidden border-2 border-transparent"
                        >
                            {/* Top Highlight Bar */}
                            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${subject.colorClass} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`} />

                            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-r ${subject.colorClass} flex items-center justify-center text-4xl mb-6 shadow-lg`}>
                                {subject.icon}
                            </div>

                            <h3 className="text-2xl font-bold text-gray-800 mb-4">
                                {subject.title}
                            </h3>

                            <p className="text-gray-600 leading-relaxed mb-6">
                                {subject.description}
                            </p>

                            <div className="space-y-3">
                                {subject.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-2.5">
                                        <span className={`text-lg font-bold bg-gradient-to-r ${subject.colorClass} bg-clip-text text-transparent`}>
                                            ✓
                                        </span>
                                        <span className="text-gray-700">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}