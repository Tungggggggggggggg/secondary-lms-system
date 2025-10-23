'use client';

import React, { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import EmailStep from './EmailStep';
import VerifyStep from './VerifyStep';
import NewPasswordStep from './NewPasswordStep';
import SuccessStep from './SuccessStep';

type Step = 1 | 2 | 3 | 4;

export default function ResetPassword() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const handleEmailSubmit = async (submittedEmail: string) => {
    try {
      setIsLoading(true);
      // TODO: API call to send reset code
      await new Promise((r) => setTimeout(r, 1000));
      
      setEmail(submittedEmail);
      setCurrentStep(2);
      toast({
        title: '📧 Mã xác nhận đã được gửi!',
        description: 'Vui lòng kiểm tra email của bạn.',
        variant: 'success',
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error sending reset code:', err);
      toast({
        title: '❌ Không thể gửi mã xác nhận',
        description: 'Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (verificationCode: string) => {
    try {
      setIsLoading(true);
      // TODO: API call to verify code
      await new Promise((r) => setTimeout(r, 1000));
      console.log('Verifying code:', verificationCode);

      setCurrentStep(3);
      toast({
        title: '✅ Xác thực thành công!',
        variant: 'success',
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error verifying code:', err);
      toast({
        title: '❌ Mã xác nhận không đúng',
        description: 'Vui lòng kiểm tra và thử lại.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setIsLoading(true);
      // TODO: API call to resend code
      await new Promise((r) => setTimeout(r, 1000));

      toast({
        title: '📧 Đã gửi lại mã xác nhận!',
        variant: 'success',
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error resending code:', err);
      toast({
        title: '❌ Không thể gửi lại mã',
        description: 'Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    try {
      setIsLoading(true);
      // TODO: API call to reset password
      await new Promise((r) => setTimeout(r, 1000));
      console.log('Resetting password for:', email, 'New password length:', password.length);

      setCurrentStep(4);
      toast({
        title: '🎉 Đặt lại mật khẩu thành công!',
        variant: 'success',
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error resetting password:', err);
      if (err instanceof Error) {
        toast({
          title: '❌ ' + err.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: '❌ Không thể đặt lại mật khẩu',
          description: 'Vui lòng thử lại sau.',
          variant: 'destructive',
        });
      }
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