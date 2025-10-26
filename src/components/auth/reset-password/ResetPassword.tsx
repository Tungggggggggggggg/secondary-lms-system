'use client';

import React, { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import EmailStep from './EmailStep';
import VerifyStep from './VerifyStep';
import NewPasswordStep from './NewPasswordStep';
import SuccessStep from './SuccessStep';

type Step = 1 | 2 | 3 | 4;

interface ValidationError {
  field: string;
  message: string;
}

export default function ResetPassword() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const handleEmailSubmit = async (submittedEmail: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/reset-password/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: submittedEmail }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }
      
      setEmail(submittedEmail);
      setCurrentStep(2);
      toast({
        title: '📧 Mã xác nhận đã được gửi!',
        description: 'Vui lòng kiểm tra email của bạn.',
        variant: 'success',
      });
    } catch (err) {
      console.error('Error sending reset code:', err);
      toast({
        title: '❌ Không thể gửi mã xác nhận',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/reset-password/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          token: code 
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      setVerificationCode(code);
      setCurrentStep(3);
      toast({
        title: '✅ Xác thực thành công!',
        variant: 'success',
      });
    } catch (err) {
      console.error('Error verifying code:', err);
      toast({
        title: '❌ Mã xác nhận không đúng',
        description: err instanceof Error ? err.message : 'Vui lòng kiểm tra và thử lại.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/reset-password/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      toast({
        title: '📧 Đã gửi lại mã xác nhận!',
        variant: 'success',
      });
    } catch (err) {
      console.error('Error resending code:', err);
      toast({
        title: '❌ Không thể gửi lại mã',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/reset-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          token: verificationCode,
          password 
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (data.details) {
          // Validation errors
          const errors = (data.details as ValidationError[])
            .map(error => error.message)
            .join('\n');
          throw new Error(errors);
        }
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      setCurrentStep(4);
      toast({
        title: '🎉 Đặt lại mật khẩu thành công!',
        variant: 'success',
      });
    } catch (err) {
      console.error('Error resetting password:', err);
      toast({
        title: '❌ ' + (err instanceof Error ? err.message : 'Không thể đặt lại mật khẩu'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={wrapperRef} className="bg-white rounded-3xl shadow-2xl p-12 max-w-[480px] w-full animate-fade-in relative z-10">
      {/* Step Indicator */}
      <div className="flex justify-center gap-2 mb-8">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-2.5 rounded-full transition-all ${
              step === currentStep
                ? 'w-8 bg-gradient-to-r from-violet-400 to-pink-400'
                : 'w-2.5 bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Steps */}
      {currentStep === 1 && (
        <EmailStep onSubmit={handleEmailSubmit} isLoading={isLoading} />
      )}
      {currentStep === 2 && (
        <VerifyStep
          onSubmit={handleVerifyCode}
          onResend={handleResendCode}
          onChangeEmail={() => setCurrentStep(1)}
          isLoading={isLoading}
          email={email}
        />
      )}
      {currentStep === 3 && (
        <NewPasswordStep onSubmit={handlePasswordSubmit} isLoading={isLoading} />
      )}
      {currentStep === 4 && <SuccessStep />}
    </div>
  );
}