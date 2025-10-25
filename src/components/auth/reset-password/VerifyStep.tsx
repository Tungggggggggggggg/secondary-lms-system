'use client';

import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface VerifyStepProps {
  onSubmit: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onChangeEmail: () => void;
  isLoading: boolean;
  email: string;
}

export default function VerifyStep({ 
  onSubmit, 
  onResend, 
  onChangeEmail, 
  isLoading, 
  email 
}: VerifyStepProps) {
  const [code, setCode] = React.useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = React.useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleInput = (index: number, value: string) => {
    // Chỉ cho phép số
    if (value && !/^\d+$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Tự động focus vào ô tiếp theo
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const numbers = pastedData.replace(/[^0-9]/g, '').split('');
    
    const newCode = [...code];
    numbers.forEach((num, index) => {
      if (index < 6) newCode[index] = num;
    });
    setCode(newCode);

    // Focus vào ô cuối cùng có giá trị
    const lastFilledIndex = Math.min(numbers.length - 1, 5);
    if (lastFilledIndex >= 0) {
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length === 6) {
      await onSubmit(fullCode);
    }
  };

  return (
    <>
      <div className="logo-section text-center mb-8">
        <div 
          className="text-6xl mb-4 inline-block animate-float-3d" 
          role="img" 
          aria-label="Biểu tượng xác thực"
        >
          📬
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent mb-3">
          Nhập mã xác nhận
        </h1>
        <p className="text-sm text-gray-600 max-w-[360px] mx-auto">
          Chúng tôi đã gửi mã 6 số đến email <strong>{email}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex justify-center gap-3 mb-6">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              value={digit}
              onChange={(e) => handleInput(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-14 h-14 text-center text-2xl font-semibold bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-violet-400 focus:bg-white focus:outline-none transition-colors"
              maxLength={1}
              autoComplete="off"
              inputMode="numeric"
              required
            />
          ))}
        </div>

        <div className="text-center mb-6 text-sm">
          <span className="text-gray-600">Không nhận được mã? </span>
          {timeLeft > 0 ? (
            <span className="text-pink-400 font-semibold">
              Gửi lại sau ({timeLeft}s)
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                onResend();
                setTimeLeft(60);
              }}
              className="text-violet-400 font-semibold hover:text-violet-600"
            >
              Gửi lại mã
            </button>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading || code.join('').length !== 6}
          className="w-full h-12 bg-gradient-to-r from-violet-400 to-violet-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              Đang xác thực...
            </span>
          ) : (
            'Xác nhận mã ✓'
          )}
        </Button>
      </form>

      <div className="text-center mt-6">
        <button
          onClick={onChangeEmail}
          className="text-violet-400 hover:text-violet-600 font-semibold text-sm"
        >
          ← Thay đổi email
        </button>
      </div>
    </>
  );
}