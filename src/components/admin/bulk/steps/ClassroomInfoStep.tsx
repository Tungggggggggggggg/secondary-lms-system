/**
 * Classroom Info Step - Bước 1 của Wizard
 * Thu thập thông tin cơ bản về lớp học
 */

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, Hash, Palette } from "lucide-react";
import { WizardData } from "../BulkClassroomWizard";

interface ClassroomInfoStepProps {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const CLASSROOM_ICONS = [
  '📚', '📖', '🎓', '🏫', '👨‍🏫', '👩‍🏫', 
  '📝', '✏️', '🖊️', '📐', '🧮', '🔬',
  '🎨', '🎵', '🏃‍♂️', '🌍', '💻', '🔢'
];

const GRADE_OPTIONS = [
  '6', '7', '8', '9', '10', '11', '12'
];

const SUBJECT_OPTIONS = [
  'Toán', 'Văn', 'Tiếng Anh', 'Vật Lý', 'Hóa Học', 'Sinh Học',
  'Lịch Sử', 'Địa Lý', 'GDCD', 'Tin Học', 'Thể Dục', 'Âm Nhạc', 'Mỹ Thuật'
];

export default function ClassroomInfoStep({
  data,
  onUpdate,
  onNext,
  onPrevious
}: ClassroomInfoStepProps) {

  const handleInputChange = (field: keyof WizardData, value: any) => {
    onUpdate({ [field]: value });
  };

  const isValid = data.name && data.name.trim().length >= 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-violet-600" />
          Thông tin lớp học cơ bản
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tên lớp học */}
        <div className="space-y-2">
          <Label htmlFor="classroom-name" className="text-sm font-medium">
            Tên lớp học *
          </Label>
          <Input
            id="classroom-name"
            value={data.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Ví dụ: Lớp 12A1 - Năm học 2024-2025"
            className="text-base"
          />
          {!data.name && (
            <p className="text-sm text-red-500">Tên lớp học là bắt buộc</p>
          )}
        </div>

        {/* Mô tả */}
        <div className="space-y-2">
          <Label htmlFor="classroom-description" className="text-sm font-medium">
            Mô tả lớp học
          </Label>
          <Textarea
            id="classroom-description"
            value={data.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Mô tả ngắn về lớp học này..."
            rows={3}
            className="text-base"
          />
        </div>

        {/* Row 1: Icon và Mã lớp */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Icon lớp học */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Icon lớp học
            </Label>
            <div className="grid grid-cols-6 gap-2">
              {CLASSROOM_ICONS.map((icon) => (
                <Button
                  key={icon}
                  type="button"
                  variant={data.icon === icon ? "default" : "outline"}
                  size="default"
                  onClick={() => handleInputChange('icon', icon)}
                  className="h-10 w-10 p-0 text-lg"
                >
                  {icon}
                </Button>
              ))}
            </div>
          </div>

          {/* Mã lớp học */}
          <div className="space-y-2">
            <Label htmlFor="classroom-code" className="text-sm font-medium flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Mã lớp học
            </Label>
            <Input
              id="classroom-code"
              value={data.code || ''}
              onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
              placeholder="Để trống để tự động tạo"
              className="text-base font-mono"
              maxLength={10}
            />
            <p className="text-xs text-gray-500">
              Mã lớp 4-10 ký tự, chỉ chữ hoa và số. Để trống để hệ thống tự tạo.
            </p>
          </div>
        </div>

        {/* Row 2: Số lượng học sinh tối đa */}
        <div className="space-y-2">
          <Label htmlFor="max-students" className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Số lượng học sinh tối đa
          </Label>
          <Input
            id="max-students"
            type="number"
            value={data.maxStudents}
            onChange={(e) => handleInputChange('maxStudents', parseInt(e.target.value) || 30)}
            min={1}
            max={100}
            className="text-base w-32"
          />
          <p className="text-xs text-gray-500">
            Từ 1 đến 100 học sinh
          </p>
        </div>

        {/* Row 3: Khối lớp và Môn học */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Khối lớp */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Khối lớp</Label>
            <div className="flex flex-wrap gap-2">
              {GRADE_OPTIONS.map((grade) => (
                <Badge
                  key={grade}
                  variant={data.grade === grade ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleInputChange('grade', grade)}
                >
                  Lớp {grade}
                </Badge>
              ))}
            </div>
          </div>

          {/* Môn học */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Môn học chính</Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {SUBJECT_OPTIONS.map((subject) => (
                <Badge
                  key={subject}
                  variant={data.subject === subject ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleInputChange('subject', subject)}
                >
                  {subject}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Năm học */}
        <div className="space-y-2">
          <Label htmlFor="academic-year" className="text-sm font-medium">
            Năm học
          </Label>
          <Input
            id="academic-year"
            value={data.academicYear || new Date().getFullYear().toString()}
            onChange={(e) => handleInputChange('academicYear', e.target.value)}
            placeholder="2024-2025"
            className="text-base w-40"
          />
        </div>

        {/* Validation Summary */}
        {!isValid && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              ⚠️ Vui lòng điền tên lớp học để tiếp tục
            </p>
          </div>
        )}

        {isValid && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">
              ✅ Thông tin lớp học đã đầy đủ
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
