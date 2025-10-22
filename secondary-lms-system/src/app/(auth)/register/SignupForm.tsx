'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Notification from '@/components/shared/NotificationBell';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function SignupForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'student' | 'teacher' | 'parent'
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setNotif({ type: 'error', message: '👤 Please enter your name' });
      return false;
    }
    if (!formData.email.trim()) {
      setNotif({ type: 'error', message: '📧 Please enter your email' });
      return false;
    }
    if (formData.password.length < 6) {
      setNotif({ type: 'error', message: '🔒 Password must be at least 6 characters' });
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setNotif({ type: 'error', message: '🔐 Passwords do not match' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setNotif({ 
        type: 'success', 
        message: `🎉 Welcome to EduFun, ${formData.name}! Your account has been created successfully!` 
      });
      
      // Reset form after successful signup
      setTimeout(() => {
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'student'
        });
      }, 2000);
    }, 1500);
  };

  const handleGoogleSignup = async () => {
    setNotif({ type: 'info', message: '🔗 Redirecting to Google authentication...' });
    await signIn('google');
  };

  const getRoleEmoji = (role: string) => {
    switch (role) {
      case 'student': return '🧑‍🎓';
      case 'teacher': return '👩‍🏫';
      case 'parent': return '👨‍👩‍👧‍👦';
      default: return '🧑‍🎓';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'student': return 'Learn and explore courses';
      case 'teacher': return 'Create and manage courses';
      case 'parent': return 'Monitor your child\'s progress';
      default: return 'Learn and explore courses';
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Name Input */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">👤</span>
          <input
            type="text"
            name="name"
            value={formData.name}
            required
            onChange={handleInputChange}
            placeholder="Enter your full name"
            className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/50 border-2 border-white/40 focus:border-green-500 outline-none text-gray-700 font-medium transition"
          />
        </div>

        {/* Email Input */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">📧</span>
          <input
            type="email"
            name="email"
            value={formData.email}
            required
            onChange={handleInputChange}
            placeholder="Enter your email"
            className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/50 border-2 border-white/40 focus:border-green-500 outline-none text-gray-700 font-medium transition"
          />
        </div>

        {/* Role Selection */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">{getRoleEmoji(formData.role)}</span>
          <select
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/50 border-2 border-white/40 focus:border-green-500 outline-none text-gray-700 font-medium transition appearance-none cursor-pointer"
          >
            <option value="student">Student - Learn and explore courses</option>
            <option value="teacher">Teacher - Create and manage courses</option>
            <option value="parent">Parent - Monitor your child's progress</option>
          </select>
        </div>

        {/* Password Input */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">🔒</span>
          <input
            type={showPwd ? 'text' : 'password'}
            name="password"
            value={formData.password}
            required
            onChange={handleInputChange}
            placeholder="Create a password"
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/50 border-2 border-white/40 focus:border-green-500 outline-none text-gray-700 font-medium transition"
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-500 hover:text-green-500"
          >
            {showPwd ? '🙈' : '👁️'}
          </button>
        </div>

        {/* Confirm Password Input */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">🔐</span>
          <input
            type={showConfirmPwd ? 'text' : 'password'}
            name="confirmPassword"
            value={formData.confirmPassword}
            required
            onChange={handleInputChange}
            placeholder="Confirm your password"
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/50 border-2 border-white/40 focus:border-green-500 outline-none text-gray-700 font-medium transition"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPwd(!showConfirmPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-500 hover:text-green-500"
          >
            {showConfirmPwd ? '🙈' : '👁️'}
          </button>
        </div>

        {/* Role Info Display */}
        <div className="bg-white/30 rounded-xl p-3 border border-white/40">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-lg">{getRoleEmoji(formData.role)}</span>
            <span className="font-medium">As a {formData.role}:</span>
            <span className="text-gray-600">{getRoleDescription(formData.role)}</span>
          </div>
        </div>

        <Button type="submit" isLoading={loading}>
          Join EduFun! 🚀
        </Button>

        <Button type="button" variant="secondary" onClick={handleGoogleSignup}>
          <img src="/google.svg" alt="Google" className="w-5 h-5" /> Continue with Google
        </Button>

        <div className="text-center mt-2">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-green-600 hover:text-green-800 font-medium transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </form>

      {notif && <Notification type={notif.type} message={notif.message} onClose={() => setNotif(null)} />}
    </>
  );
}
