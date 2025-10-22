'use client';
import FloatingElements from './FloatingElements';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-100 via-blue-100 to-indigo-100 flex items-center justify-center p-6">
      <FloatingElements />
      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-2xl bg-white/30 border border-white/40 rounded-3xl shadow-2xl p-8 animate-slideUp">
          <header className="text-center mb-6">
            <div className="text-5xl mb-3 animate-bounce">🎒</div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome to EduFun!</h1>
            <p className="text-gray-500 font-medium">Learn Fun with History, Geography, English!</p>
          </header>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
