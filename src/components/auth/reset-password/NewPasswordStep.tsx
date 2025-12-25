'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { passwordSchema } from '@/lib/validation/password.schema';

interface NewPasswordStepProps {
  onSubmit: (password: string) => Promise<void>;
  isLoading: boolean;
}

interface PasswordRequirement {
  id: string;
  label: string;
  validator: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: 'length',
    label: 'Ít nhất 8 ký tự',
    validator: (password: string) => password.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'Có chữ hoa (A-Z)',
    validator: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'Có chữ thường (a-z)',
    validator: (password: string) => /[a-z]/.test(password),
  },
  {
    id: 'number',
    label: 'Có số (0-9)',
    validator: (password: string) => /[0-9]/.test(password),
  },
];

export default function NewPasswordStep({ onSubmit, isLoading }: NewPasswordStepProps) {
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [requirements, setRequirements] = React.useState<Record<string, boolean>>({});

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const newRequirements = PASSWORD_REQUIREMENTS.reduce((acc, req) => ({
      ...acc,
      [req.id]: req.validator(value),
    }), {});
    setRequirements(newRequirements);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      // Toast sẽ được xử lý ở component cha
      throw new Error('Mật khẩu xác nhận không khớp!');
    }

    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Mật khẩu chưa đáp ứng đủ yêu cầu!';
      throw new Error(msg);
    }

    await onSubmit(password);
  };

  return (
    <>
      <div className="logo-section text-center mb-8">
        <div 
          className="text-6xl mb-4 inline-block animate-float-3d" 
          role="img" 
          aria-label="Biểu tượng mật khẩu mới"
        >
          🔐
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent mb-3">
          Tạo mật khẩu mới
        </h1>
        <p className="text-sm text-gray-600 max-w-[360px] mx-auto">
          Hãy tạo một mật khẩu mạnh và an toàn cho tài khoản của bạn
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700 mb-2 block">
            Mật khẩu mới
          </Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl" aria-hidden>
              🔒
            </span>
            <Input
              id="newPassword"
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Nhập mật khẩu mới"
              className="pl-12 h-12"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 mb-2 block">
            Xác nhận mật khẩu
          </Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl" aria-hidden>
              🔑
            </span>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className="pl-12 h-12"
              required
            />
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          {PASSWORD_REQUIREMENTS.map((req) => (
            <div
              key={req.id}
              className={`flex items-center gap-2 text-sm ${
                requirements[req.id] ? 'text-green-600' : 'text-gray-600'
              }`}
            >
              <span>{requirements[req.id] ? '✓' : '○'}</span>
              <span>{req.label}</span>
            </div>
          ))}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-gradient-to-r from-violet-400 to-violet-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              Đang cập nhật...
            </span>
          ) : (
            'Đặt lại mật khẩu 🔄'
          )}
        </Button>
      </form>
    </>
  );
}