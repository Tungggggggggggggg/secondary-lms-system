'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Notification from '@/components/shared/NotificationBell';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setNotif({ type: 'success', message: '🎉 Login successful! Welcome to EduFun!' });
    }, 1500);
  };

  const handleGoogleLogin = async () => {
    setNotif({ type: 'info', message: '🔗 Redirecting to Google authentication...' });
    await signIn('google');
  };

  const handleForgot = () => {
    setNotif({ type: 'info', message: '📧 A reset link will be sent to your email' });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">📧</span>
          <input
            type="email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/50 border-2 border-white/40 focus:border-blue-500 outline-none text-gray-700 font-medium transition"
          />
        </div>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">🔒</span>
          <input
            type={showPwd ? 'text' : 'password'}
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/50 border-2 border-white/40 focus:border-blue-500 outline-none text-gray-700 font-medium transition"
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-500 hover:text-blue-500"
          >
            {showPwd ? '🙈' : '👁️'}
          </button>
        </div>

        <Button type="submit" isLoading={loading}>
          Login to Learn! 🚀
        </Button>

        <Button type="button" variant="secondary" onClick={handleGoogleLogin}>
          <img src="/google.svg" alt="Google" className="w-5 h-5" /> Continue with Google
        </Button>

        <div className="text-center mt-2">
          <button type="button" onClick={handleForgot} className="text-sm text-gray-500 hover:text-blue-500 font-medium">
            Forgot Password?
          </button>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
              Sign up here
            </Link>
          </p>
        </div>
      </form>

      {notif && <Notification type={notif.type} message={notif.message} onClose={() => setNotif(null)} />}
    </>
  );
}
