// FILE: components/auth/select-role/RoleSelector.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import RoleCard from './RoleCard';
import { useSession, signOut } from 'next-auth/react';

// Định nghĩa các vai trò có sẵn - Giảm xuống 3 features quan trọng nhất
const ROLES = {
  teacher: {
    title: 'Giáo viên',
    icon: '👨‍🏫',
    description: 'Quản lý lớp học và theo dõi tiến độ học sinh',
    features: [
      { icon: '📚', text: 'Tạo và quản lý bài giảng' },
      { icon: '📊', text: 'Theo dõi kết quả học tập' },
      { icon: '✍️', text: 'Chấm bài và đánh giá' },
    ],
  },
  student: {
    title: 'Học sinh',
    icon: '👨‍🎓',
    description: 'Học tập và làm bài tập trực tuyến',
    features: [
      { icon: '📖', text: 'Truy cập tài liệu học tập' },
      { icon: '📝', text: 'Làm bài tập trực tuyến' },
      { icon: '🎯', text: 'Xem điểm và nhận xét' },
    ],
  },
  parent: {
    title: 'Phụ huynh',
    icon: '👨‍👩‍👧',
    description: 'Theo dõi quá trình học tập của con',
    features: [
      { icon: '👀', text: 'Xem tiến độ học tập' },
      { icon: '📈', text: 'Nhận báo cáo định kỳ' },
      { icon: '📞', text: 'Liên lạc với giáo viên' },
    ],
  },
} as const;

type RoleType = keyof typeof ROLES;

export default function RoleSelector() {
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { data: session, update } = useSession();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Xử lý chọn vai trò
  const handleRoleSelect = (role: RoleType) => {
    setSelectedRole(role);
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

    toast({ title: '🔙 Đang quay lại trang trước...', variant: 'default' });

    if (session?.user?.id && selectedRole) {
      try {
        await signOut({ redirect: false });
      } catch (err) {
        console.error('[RoleSelector] signOut error:', err);
      }
    }

    router.back();
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

      const res = await fetch('/api/users/role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error('[RoleSelector] Update role API error', { status: res.status, data });
        toast({
          title: '❌ Cập nhật vai trò thất bại!',
          description: data?.message || 'Không thể cập nhật vai trò. Vui lòng thử lại.',
          variant: 'destructive',
        });
        return;
      }

      try {
        await update?.();
      } catch (err) {
        console.error('[RoleSelector] session update failed:', err);
      }

      const roleMessages: Record<RoleType, string> = {
        teacher: '👨‍🏫 Chào mừng Giáo viên! Đang chuyển đến trang quản lý...',
        student: '👨‍🎓 Chào mừng Học sinh! Đang chuyển đến lớp học...',
        parent: '👨‍👩‍👧 Chào mừng Phụ huynh! Đang chuyển đến bảng theo dõi...',
      };

      toast({ title: roleMessages[selectedRole], variant: 'success' });

      router.push(`/dashboard/${selectedRole}`);
    } catch (error) {
      console.error('[RoleSelector] Error updating role:', error);
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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-violet-50 via-pink-50 to-violet-50 overflow-hidden">
      {/* Container chính - Tối ưu tối đa để fit viewport */}
      <div 
        ref={wrapperRef} 
        className="w-full max-w-6xl px-3 py-4 md:py-6 animate-fade-in"
      >
        {/* Header Section - Giảm tối đa spacing */}
        <div className="text-center mb-4 md:mb-5">
          <div 
            className="text-4xl md:text-5xl mb-2 inline-block animate-float" 
            role="img" 
            aria-label="Target emoji"
          >
            🎯
          </div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1.5 bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
            Chọn vai trò của bạn
          </h1>
          <p className="text-xs md:text-sm text-gray-600 max-w-xl mx-auto px-4">
            Hãy cho chúng tôi biết bạn là ai để cung cấp trải nghiệm phù hợp nhất
          </p>
        </div>

        {/* Role Cards Grid - Tối ưu gap */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 lg:gap-5 mb-4 md:mb-5">
          {(Object.entries(ROLES) as [RoleType, typeof ROLES[RoleType]][]).map(([role, data]) => (
            <div key={role} className="w-full">
              <RoleCard
                role={role}
                title={data.title}
                icon={data.icon}
                description={data.description}
                features={data.features}
                selected={selectedRole === role}
                onSelect={handleRoleSelect}
              />
            </div>
          ))}
        </div>

        {/* Action Buttons - Compact với info inline */}
        <div className="max-w-lg mx-auto space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Button 
              variant="outline" 
              size="default"
              className="flex-1 h-10" 
              onClick={handleGoBack} 
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>

            <Button
              variant="default"
              size="default"
              className={cn(
                'flex-1 h-10 relative overflow-hidden',
                'bg-gradient-to-r from-violet-500 to-pink-500',
                'hover:from-violet-600 hover:to-pink-600',
                'transition-all duration-300'
              )}
              onClick={handleContinue}
              disabled={!selectedRole || isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
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

          {/* Info Box - Compact inline */}
        <div className="p-3 md:p-4 bg-white/95 rounded-xl shadow-md max-w-2xl mx-auto text-center">
          <p className="text-gray-600 text-xs md:text-sm">
            💡 <strong className="text-violet-600 font-semibold">Mẹo:</strong> Bạn có thể thay đổi vai trò sau trong phần cài đặt tài khoản. Hãy chọn vai trò phù hợp nhất với bạn hiện tại!
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}