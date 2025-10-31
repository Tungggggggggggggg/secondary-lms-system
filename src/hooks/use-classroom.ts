
import { useState, useCallback } from 'react';
import { CreateClassroomDTO, ClassroomResponse } from '@/types/classroom';
import { SearchClassesQuery, SearchClassesResponse } from '@/types/api';

export const useClassroom = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<ClassroomResponse[] | null>(null);


  // Hàm lấy danh sách lớp học
  // Hàm lấy danh sách lớp học, bọc useCallback để tránh vòng lặp useEffect
  const fetchClassrooms = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('[fetchClassrooms] Bắt đầu lấy danh sách lớp học...');
      const response = await fetch('/api/classrooms');
      const result = await response.json();
      if (!response.ok) {
        // Nếu server trả 403 (Forbidden) — có thể người dùng không phải teacher
        // Thay vì ném lỗi, xử lý mềm: đặt danh sách rỗng để UI không hiển thị lỗi vòng lặp
        if (response.status === 403) {
          console.warn('[fetchClassrooms] Forbidden - user is not a teacher. Trả về danh sách rỗng.');
          setClassrooms([]);
          setError(null);
          return;
        }
        console.error('[fetchClassrooms] Lỗi response:', result?.message || response.statusText);
        throw new Error(result?.message || 'Có lỗi xảy ra khi lấy danh sách lớp học');
      }
      // Nếu server trả về success:false nhưng status 200 (ví dụ chưa có dữ liệu), xử lý an toàn
      if (result && result.success === false) {
        console.warn('[fetchClassrooms] Server trả về success:false — trả về dữ liệu rỗng.', result.message);
        setClassrooms([]);
        return;
      }
      setClassrooms(result.data ?? []);
      console.log('[fetchClassrooms] Lấy danh sách lớp học thành công:', result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(msg);
      setClassrooms(null);
      console.error('[fetchClassrooms] Lỗi:', msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Hàm tạo lớp học
  const createClassroom = async (data: CreateClassroomDTO): Promise<ClassroomResponse | null> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('[createClassroom] Bắt đầu tạo lớp học...');
      const response = await fetch('/api/classrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error('[createClassroom] Lỗi response:', result.message);
        throw new Error(result.message || 'Có lỗi xảy ra khi tạo lớp học');
      }
      console.log('[createClassroom] Tạo lớp học thành công:', result.data);
      return result.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(msg);
      console.error('[createClassroom] Lỗi:', msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    classrooms,
    fetchClassrooms,
    createClassroom,
    searchClassrooms: useCallback(
      async (
        params: SearchClassesQuery,
        options?: { signal?: AbortSignal }
      ): Promise<SearchClassesResponse> => {
        try {
          setError(null);
          const usp = new URLSearchParams();
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && String(v).length > 0) {
              usp.set(k, String(v));
            }
          });
          const res = await fetch(`/api/classrooms/search?${usp.toString()}`, {
            method: 'GET',
            signal: options?.signal,
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.error || 'Không thể tìm kiếm lớp học');
          }
          return data as SearchClassesResponse;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
          setError(msg);
          throw err;
        }
      },
      []
    ),
    getClassroomById: useCallback(async (id: string): Promise<ClassroomResponse | null> => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/classrooms/${id}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Không thể tải lớp học');
        }
        return data as ClassroomResponse;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
        setError(msg);
        console.error('[getClassroomById] Lỗi:', msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    }, []),
    isLoading,
    error,
  };
};