import { useState } from 'react';
import { CreateClassroomDTO, ClassroomResponse } from '@/types/classroom';

export const useClassroom = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createClassroom = async (data: CreateClassroomDTO): Promise<ClassroomResponse | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/classrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Có lỗi xảy ra khi tạo lớp học');
      }

      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createClassroom,
    isLoading,
    error,
  };
};