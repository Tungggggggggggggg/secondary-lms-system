"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  CheckCircle, 
  AlertCircle,
  Search,
  BookOpen
} from 'lucide-react';
import { Input } from '@/components/ui/input';

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
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch classrooms
  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const response = await fetch('/api/classrooms');
        const data = await response.json();
        console.log('📚 Classrooms API Response:', data);
        if (data.success) {
          // API trả về data.data, không phải data.classrooms
          const classroomList = data.data || [];
          console.log('📚 Parsed classrooms:', classroomList);
          // Map API response to component format
          type ApiClassroom = {
            id: string;
            name: string;
            description?: string;
            _count?: { students?: number };
          };
          const mappedClassrooms = (classroomList as ApiClassroom[]).map((classroom) => ({
            id: classroom.id,
            name: classroom.name,
            studentCount: classroom._count?.students || 0,
            subject: classroom.description
          }));
          setClassrooms(mappedClassrooms);
        }
      } catch (error) {
        console.error('Error fetching classrooms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClassrooms();
  }, []);

  // Filter classrooms based on search
  const filteredClassrooms = classrooms.filter(classroom =>
    classroom.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (loading) {
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

        {/* Selection Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Lớp học đã chọn ({selectedClassrooms.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedClassrooms.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedClassrooms.map(classroomId => {
                  const classroom = classrooms.find(c => c.id === classroomId);
                  return classroom ? (
                    <Badge key={classroomId} variant="outline" className="bg-blue-100 text-blue-800">
                      {classroom.name} ({classroom.studentCount} học sinh)
                    </Badge>
                  ) : null;
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <AlertCircle className="h-4 w-4" />
                <span>Chưa chọn lớp học nào</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Classroom List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Danh sách lớp học
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={selectAll}>
                  Chọn tất cả
                </Button>
                <Button variant="outline" onClick={clearAll}>
                  Bỏ chọn
                </Button>
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
                {filteredClassrooms.map((classroom) => {
                  const isSelected = selectedClassrooms.includes(classroom.id);
                  
                  return (
                    <div
                      key={classroom.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                      onClick={() => handleClassroomToggle(classroom.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Checkbox 
                              checked={isSelected}
                              onChange={() => {}} // Handled by parent click
                            />
                            <h4 className="font-semibold text-gray-800">
                              {classroom.name}
                            </h4>
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{classroom.studentCount} học sinh</span>
                            </div>
                            {classroom.subject && (
                              <div className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                <span>{classroom.subject}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
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

        {/* Selection Info */}
        {selectedClassrooms.length > 0 && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Đã chọn {selectedClassrooms.length} lớp học với tổng cộng{' '}
                  {selectedClassrooms.reduce((total, id) => {
                    const classroom = classrooms.find(c => c.id === id);
                    return total + (classroom?.studentCount || 0);
                  }, 0)} học sinh
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ClassroomSelector;
