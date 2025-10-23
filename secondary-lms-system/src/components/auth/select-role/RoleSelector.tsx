'use client';

import { useState, useRef } from 'react';
import { useGsapRef } from '@/hooks/use-gsap';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import RoleCard from './RoleCard';

// Định nghĩa các vai trò có sẵn
const ROLES = {
  teacher: {
    title: 'Giáo viên',
    icon: '👨‍🏫',
    description: 'Quản lý lớp học, tạo bài giảng và theo dõi tiến độ học tập của học sinh',
    features: [
      { icon: '📚', text: 'Tạo và quản lý nội dung bài giảng' },
      { icon: '📊', text: 'Theo dõi kết quả học tập' },
      { icon: '✍️', text: 'Chấm bài và đánh giá học sinh' },
      { icon: '💬', text: 'Giao tiếp với học sinh & phụ huynh' },
    ],
  },
  student: {
    title: 'Học sinh',
    icon: '👨‍🎓',
    description: 'Học tập, làm bài tập và theo dõi tiến độ của bản thân một cách dễ dàng',
    features: [
      { icon: '📖', text: 'Truy cập tài liệu học tập' },
      { icon: '📝', text: 'Làm bài tập và kiểm tra trực tuyến' },
      { icon: '🎯', text: 'Xem điểm số và nhận xét' },
      { icon: '🏆', text: 'Tham gia thử thách và nhận thưởng' },
    ],
  },
  parent: {
    title: 'Phụ huynh',
    icon: '👨‍👩‍👧',
    description: 'Theo dõi quá trình học tập và kết nối với giáo viên để hỗ trợ con em',
    features: [
      { icon: '👀', text: 'Xem tiến độ học tập của con' },
      { icon: '📈', text: 'Nhận báo cáo thành tích định kỳ' },
      { icon: '📞', text: 'Liên lạc với giáo viên' },
      { icon: '🔔', text: 'Nhận thông báo quan trọng' },
    ],
  },
} as const;

type RoleType = keyof typeof ROLES;

export default function RoleSelector() {
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // Kích hoạt GSAP animation cho phần tử wrapper
  useGsapRef(wrapperRef, { stagger: 0.05 });

  // Xử lý chọn vai trò
  const handleRoleSelect = (role: RoleType) => {
    setSelectedRole(role);
    // Hiển thị toast thông báo
    toast({
      title: `✨ Bạn đã chọn vai trò: ${ROLES[role].title} ${ROLES[role].icon}`,
      variant: 'default',
    });
  };

  // Xử lý quay lại
  const handleGoBack = async () => {
    if (selectedRole && !isLoading) {
      const confirmed = window.confirm('Bạn có chắc muốn quay lại? Lựa chọn của bạn sẽ không được lưu.');
      if (!confirmed) return;
    }

    toast({
      title: '🔙 Đang quay lại trang trước...',
      variant: 'default',
    });

    // Chờ toast hiển thị xong rồi mới chuyển trang
    setTimeout(() => {
      router.back();
    }, 800);
  };

  // Xử lý tiếp tục
  const handleContinue = async () => {
    if (!selectedRole) {
      toast({
        title: '⚠️ Vui lòng chọn một vai trò!',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      // TODO: Gọi API để cập nhật vai trò
      await new Promise(r => setTimeout(r, 1000));

      const roleMessages = {
        teacher: '👨‍🏫 Chào mừng Giáo viên! Đang chuyển đến trang quản lý...',
        student: '👨‍🎓 Chào mừng Học sinh! Đang chuyển đến lớp học...',
        parent: '👨‍👩‍👧 Chào mừng Phụ huynh! Đang chuyển đến bảng theo dõi...',
      };

      toast({
        title: roleMessages[selectedRole],
        variant: 'success',
      });

      // Chờ toast hiển thị xong rồi mới chuyển trang
      setTimeout(() => {
        router.push(`/dashboard/${selectedRole}`);
      }, 1000);
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: '❌ Có lỗi xảy ra',
        description: 'Không thể cập nhật vai trò. Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative bg-gradient-to-b from-violet-50 via-pink-50 to-violet-50">
      {/* Background Decorations */}
      <div aria-hidden="true" className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/background-pattern.png')] opacity-5" />
        <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 opacity-10" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white rounded-full translate-x-1/3 translate-y-1/3 opacity-10" />
        <div className="absolute top-1/2 left-24 w-36 h-36 bg-white rounded-full opacity-10" />
      </div>

  <div ref={wrapperRef} className="container max-w-7xl mx-auto px-4 py-8 relative z-10 animate-fade-in">
        {/* Header Section */}
  <div data-gsap className="text-center mb-12">
          <div className="text-7xl mb-6 inline-block animate-float" role="img" aria-label="Target emoji">
            🎯
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
            Chọn vai trò của bạn
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Hãy cho chúng tôi biết bạn là ai để cung cấp trải nghiệm tốt nhất phù hợp với nhu cầu của bạn
          </p>
        </div>

        {/* Role Cards Grid */}
  <div className="grid md:grid-cols-3 gap-8 mb-12">
          {(Object.entries(ROLES) as [RoleType, typeof ROLES[RoleType]][]).map(([role, data]) => (
            <RoleCard
              key={role}
              role={role}
              title={data.title}
              icon={data.icon}
              description={data.description}
              features={data.features}
              selected={selectedRole === role}
              onSelect={() => handleRoleSelect(role)}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={handleGoBack}
            disabled={isLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          
          <Button
            variant="default"
            size="lg"
            className={cn(
              "flex-1 relative overflow-hidden",
              "bg-gradient-to-r from-violet-500 to-pink-500",
              "hover:from-violet-600 hover:to-pink-600",
              "transition-all duration-300"
            )}
            onClick={handleContinue}
            disabled={!selectedRole || isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Đang xử lý...
              </span>
            ) : (
              <>
                Tiếp tục
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-white/95 rounded-2xl shadow-lg max-w-2xl mx-auto text-center">
          <p className="text-gray-600 text-sm">
            💡 <strong className="text-violet-600 font-semibold">Mẹo:</strong>{' '}
            Bạn có thể thay đổi vai trò sau trong phần cài đặt tài khoản. Hãy chọn vai trò phù hợp nhất với bạn hiện tại!
          </p>
        </div>
      </div>
    </div>
  );
}