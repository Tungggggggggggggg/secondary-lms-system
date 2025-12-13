"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Search,
  BookOpen
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useClassroom } from '@/hooks/use-classroom';
import ClassTile from './class-picker/ClassTile';

interface Classroom {
  id: string;
  name: string;
  studentCount: number;
  subject?: string;
}

interface ClassroomSelectorProps {
  selectedClassrooms: string[];
  onClassroomsChange: (classroomIds: string[]) => void;
  className?: string;
}

export function ClassroomSelector({ 
  selectedClassrooms, 
  onClassroomsChange,
  className 
}: ClassroomSelectorProps) {
  const { classrooms, isLoading, error } = useClassroom();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch classrooms
  const mappedClassrooms: Classroom[] = useMemo(() => {
    const source = classrooms ?? [];
    return source.map((c) => ({
      id: c.id,
      name: c.name,
      studentCount: c._count?.students || 0,
      subject: c.description ?? undefined,
    }));
  }, [classrooms]);

  // Filter classrooms based on search
  const filteredClassrooms = useMemo(() => {
    const q = (debouncedSearch || '').toLowerCase();
    if (!q) return mappedClassrooms;
    return mappedClassrooms.filter((classroom) => classroom.name.toLowerCase().includes(q));
  }, [debouncedSearch, mappedClassrooms]);

  const handleClassroomToggle = (classroomId: string) => {
    const updatedSelection = selectedClassrooms.includes(classroomId)
      ? selectedClassrooms.filter(id => id !== classroomId)
      : [...selectedClassrooms, classroomId];
    
    onClassroomsChange(updatedSelection);
  };

  const selectAll = () => {
    onClassroomsChange(filteredClassrooms.map(c => c.id));
  };

  const clearAll = () => {
    onClassroomsChange([]);
  };

  // Ctrl+A để chọn tất cả danh sách đã lọc (khi không focus input/textarea)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) {
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          onClassroomsChange(filteredClassrooms.map(c => c.id));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filteredClassrooms, onClassroomsChange]);

  if (isLoading && !classrooms) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Đang tải danh sách lớp học...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <p className="text-red-600 text-sm">Không thể tải danh sách lớp học: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Chọn Lớp Học
          </h2>
          <p className="text-gray-600">
            Chọn các lớp học để giao bài tập này
          </p>
        </div>

        

        {/* Classroom List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Danh sách lớp học
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={clearAll}>Bỏ chọn</Button>
                <Button onClick={selectAll}>Chọn tất cả</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Tìm kiếm lớp học..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Classroom Grid */}
            {filteredClassrooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClassrooms.map((c) => (
                  <ClassTile
                    key={c.id}
                    id={c.id}
                    name={c.name}
                    studentsCount={c.studentCount}
                    subject={c.subject}
                    checked={selectedClassrooms.includes(c.id)}
                    onToggle={handleClassroomToggle}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>
                  {searchTerm ? 'Không tìm thấy lớp học phù hợp' : 'Chưa có lớp học nào'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        
      </div>
    </div>
  );
}

export default ClassroomSelector;
