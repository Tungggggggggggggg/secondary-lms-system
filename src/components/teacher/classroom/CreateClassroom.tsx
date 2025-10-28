'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClassroom } from '@/hooks/use-classroom';
import { toast } from 'sonner';
import { CreateClassroomDTO } from '@/types/classroom';

// Reworked Step 1: Class info (taolophoc style)
function ClassInfoForm({
  data,
  onChange,
  onNext,
}: {
  data: CreateClassroomDTO;
  onChange: (d: CreateClassroomDTO) => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<{ name?: string; maxStudents?: string }>({});

  const validate = () => {
    const newErrors: { name?: string; maxStudents?: string } = {};
    if (!data.name.trim()) newErrors.name = 'Tên lớp không được để trống';
    if (data.maxStudents < 1) newErrors.maxStudents = 'Số lượng phải lớn hơn 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Tên lớp học <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="VD: Lịch sử 8A1"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all"
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Mô tả lớp học</label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="Mô tả ngắn về lớp học..."
          rows={4}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Số lượng học viên tối đa <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={data.maxStudents}
          onChange={(e) => onChange({ ...data, maxStudents: parseInt(e.target.value) || 0 })}
          min={1}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all"
        />
        {errors.maxStudents && <p className="text-red-500 text-sm mt-1">{errors.maxStudents}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Biểu tượng lớp học</label>
        <div className="flex gap-3 flex-wrap">
          {["📜", "🗺️", "🗣️", "🧮", "🔬", "🎨", "🎵", "⚽"].map((icon) => (
            <button
              key={icon}
              onClick={() => onChange({ ...data, icon })}
              className={`w-14 h-14 text-2xl rounded-xl transition-all ${
                data.icon === icon
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg scale-110'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleNext}
        className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white font-bold rounded-xl hover:shadow-xl transition-all"
      >
        Tiếp theo →
      </button>
    </div>
  );
}

// Reworked Step 2: create/input code
function ClassCodeStep({
  code,
  onCodeChange,
  onNext,
  onBack,
}: {
  code: string;
  onCodeChange: (c: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let newCode = '';
    for (let i = 0; i < 6; i++) {
      newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    onCodeChange(newCode);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Đã sao chép mã lớp học!');
    } catch {
      toast.error('Không thể sao chép mã');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 rounded-2xl p-8 text-white text-center">
        <div className="text-6xl mb-4">🔑</div>
        <h3 className="text-2xl font-bold mb-2">Mật mã lớp học</h3>
        <p className="text-white/90 text-sm mb-6">Học viên sẽ dùng mã này để tham gia lớp của bạn</p>

        <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 mb-4">
          <input
            type="text"
            value={code}
            onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
            maxLength={10}
            placeholder="Nhập mã hoặc tự động sinh"
            className="w-full bg-transparent text-center text-3xl font-bold text-white placeholder-white/50 outline-none tracking-widest"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={generateCode}
            className="flex-1 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-semibold transition-all"
          >
            🔄 Tạo mã mới
          </button>
          <button
            onClick={copyCode}
            className="flex-1 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-semibold transition-all"
          >
            📋 Sao chép
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-xl p-4">
        <p className="text-sm text-blue-800">
          💡 <strong>Mẹo:</strong> Mã lớp nên dễ nhớ và dễ chia sẻ. Tránh các ký tự dễ nhầm lẫn như O, 0, I, 1.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-4 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all"
        >
          ← Quay lại
        </button>
        <button
          onClick={onNext}
          disabled={!code.trim()}
          className="flex-1 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white font-bold rounded-xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Tiếp theo →
        </button>
      </div>
    </div>
  );
}

// Step 3: Summary
function SummaryStep({
  data,
  code,
  onBack,
  onCreate,
  status,
}: {
  data: CreateClassroomDTO;
  code: string;
  onBack: () => void;
  onCreate: () => void;
  status: string | null;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">📋 Xác nhận thông tin</h3>

        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-3xl">{data.icon}</div>
          <div>
            <h4 className="font-bold text-lg text-gray-800">{data.name}</h4>
            <p className="text-sm text-gray-600">Mã lớp: <span className="font-mono font-bold text-purple-600">{code}</span></p>
          </div>
        </div>

        {data.description && (
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-700">{data.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-xl text-center">
            <div className="text-3xl font-bold text-blue-600">{data.maxStudents}</div>
            <div className="text-sm text-gray-600">Học viên tối đa</div>
          </div>
          <div className="p-4 bg-green-50 rounded-xl text-center">
            <div className="text-3xl font-bold text-green-600">0</div>
            <div className="text-sm text-gray-600">Học viên hiện tại</div>
          </div>
        </div>
      </div>

      {status === 'loading' && (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-xl p-4 flex items-center gap-3">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-blue-800 font-semibold">Đang tạo lớp học...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-r-xl p-4">
          <p className="text-green-800 font-semibold">✅ Tạo lớp học thành công!</p>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-4">
          <p className="text-red-800 font-semibold">❌ Có lỗi xảy ra. Vui lòng thử lại!</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={status === 'loading'}
          className="flex-1 py-4 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          ← Quay lại
        </button>
        <button
          onClick={onCreate}
          disabled={status === 'loading' || status === 'success'}
          className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'success' ? '✓ Đã tạo' : '🚀 Tạo lớp học'}
        </button>
      </div>
    </div>
  );
}

// Main Component: Quản lý luồng tạo lớp
export default function CreateClassroom() {
  const router = useRouter();
  const { createClassroom, isLoading } = useClassroom();
  const [step, setStep] = useState<number>(1);
  const [status, setStatus] = useState<string | null>(null);
  const [classData, setClassData] = useState<CreateClassroomDTO>({
    name: '',
    description: '',
    maxStudents: 30,
    icon: '📚',
  });
  const [classCode, setClassCode] = useState<string>('');

  const handleCreateClass = async () => {
    setStatus('loading');
    try {
      const payload: CreateClassroomDTO & { code?: string } = { ...classData };
  if (classCode.trim()) payload.code = classCode.trim();

      const result = await createClassroom(payload as CreateClassroomDTO);
      setStatus('success');
      if (result?.code) setClassCode(result.code);

      setTimeout(() => {
        router.push('/dashboard/teacher/courses');
        toast.success('Chúc mừng! Lớp học đã được tạo.');
      }, 1200);
    } catch (err) {
      console.error(err);
      setStatus('error');
      toast.error('Có lỗi xảy ra khi tạo lớp học');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <ClassInfoForm data={classData} onChange={setClassData} onNext={() => setStep(2)} />;
      case 2:
        return (
          <ClassCodeStep
            code={classCode}
            onCodeChange={setClassCode}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        );
      case 3:
        return (
          <SummaryStep data={classData} code={classCode} onBack={() => setStep(2)} onCreate={handleCreateClass} status={status} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white px-6 py-3 rounded-full font-bold mb-4">🎓 EduVerse</div>
          <h1 className="text-4xl font-extrabold text-gray-800 mb-2">Tạo lớp học mới</h1>
          <p className="text-gray-600">Hoàn thành 3 bước đơn giản để bắt đầu</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            {[{ num: 1, label: 'Thông tin' }, { num: 2, label: 'Mật mã' }, { num: 3, label: 'Xác nhận' }].map((s, idx) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${step >= s.num ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'bg-gray-200 text-gray-500'}`}>
                    {step > s.num ? '✓' : s.num}
                  </div>
                  <span className="text-sm font-semibold text-gray-600 mt-2">{s.label}</span>
                </div>
                {idx < 2 && <div className={`flex-1 h-1 mx-2 rounded transition-all ${step > s.num ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {(isLoading || status === 'loading') && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-2xl">
                <div className="animate-spin text-3xl mb-4">🔄</div>
                <p className="text-gray-600">Đang tạo lớp học...</p>
              </div>
            </div>
          )}

          {renderStep()}
        </div>
      </div>
    </div>
  );
}