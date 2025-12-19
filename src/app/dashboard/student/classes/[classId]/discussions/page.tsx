export default function ClassDiscussionsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                    Thảo luận lớp học
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                    Trao đổi ý kiến, đặt câu hỏi và chia sẻ kiến thức với giáo viên và bạn học.
                </p>
            </div>

            {/* Empty State */}
            <div className="bg-card/90 rounded-2xl border border-border p-8 sm:p-12 text-center shadow-sm">
                <div className="flex justify-center mb-4">
                    <div className="text-5xl">💬</div>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                    Chưa có thảo luận nào
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-6">
                    Hãy bắt đầu cuộc thảo luận đầu tiên hoặc chờ giáo viên tạo một chủ đề mới.
                </p>
            </div>
        </div>
    );
}
