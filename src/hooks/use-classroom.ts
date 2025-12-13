import { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { CreateClassroomDTO, ClassroomResponse } from '@/types/classroom';
import { SearchClassesQuery, SearchClassesResponse } from '@/types/api';

export const useClassroom = () => {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  type ClassroomsApiResponse = {
    success?: boolean;
    data?: ClassroomResponse[];
    message?: string;
  };

  const isDevelopment = process.env.NODE_ENV === 'development';

  const classroomsFetcher = useCallback(async (): Promise<ClassroomResponse[]> => {
    if (isDevelopment) console.log('[fetchClassrooms] Bắt đầu lấy danh sách lớp học...');
    const response = await fetch('/api/classrooms');
    const result = (await response.json()) as unknown;

    if (!response.ok) {
      if (response.status === 403) {
        if (isDevelopment) {
          console.warn('[fetchClassrooms] Forbidden - user is not a teacher. Trả về danh sách rỗng.');
        }
        return [];
      }

      const message =
        typeof (result as { message?: unknown } | null)?.message === 'string'
          ? String((result as { message?: unknown }).message)
          : response.statusText;
      throw new Error(message || 'Có lỗi xảy ra khi lấy danh sách lớp học');
    }

    if (result && typeof result === 'object') {
      const payload = result as ClassroomsApiResponse;
      if (payload.success === false) {
        if (isDevelopment) {
          console.warn('[fetchClassrooms] Server trả về success:false — trả về dữ liệu rỗng.', payload.message);
        }
        return [];
      }

      const data = Array.isArray(payload.data) ? payload.data : [];
      if (isDevelopment) console.log('[fetchClassrooms] Lấy danh sách lớp học thành công:', data);
      return data;
    }

    return [];
  }, [isDevelopment]);

  const {
    data: classroomsData,
    error: swrError,
    isLoading: swrLoading,
    mutate,
  } = useSWR<ClassroomResponse[]>('/api/classrooms', classroomsFetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
    dedupingInterval: 15000,
  });

  const classrooms = useMemo(() => classroomsData ?? null, [classroomsData]);

  const error = useMemo(() => {
    if (actionError) return actionError;
    if (!swrError) return null;
    return swrError instanceof Error ? swrError.message : String(swrError);
  }, [actionError, swrError]);

  const isLoading = actionLoading || swrLoading;

  // Hàm lấy danh sách lớp học
  // Hàm lấy danh sách lớp học, bọc useCallback để tránh vòng lặp useEffect
  const fetchClassrooms = useCallback(async (): Promise<void> => {
    setActionError(null);
    await mutate();
  }, [mutate]);

  // Hàm tạo lớp học
  const createClassroom = async (data: CreateClassroomDTO): Promise<ClassroomResponse | null> => {
    try {
      setActionLoading(true);
      setActionError(null);
      if (isDevelopment) console.log('[createClassroom] Bắt đầu tạo lớp học...');
      const response = await fetch('/api/classrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      const result = (await response.json()) as unknown;
      if (!response.ok) {
        const message =
          typeof (result as { message?: unknown } | null)?.message === 'string'
            ? String((result as { message?: unknown }).message)
            : response.statusText;
        if (isDevelopment) console.error('[createClassroom] Lỗi response:', message);
        throw new Error(message || 'Có lỗi xảy ra khi tạo lớp học');
      }
      const created =
        result && typeof result === 'object'
          ? ((result as { data?: unknown }).data as ClassroomResponse | undefined)
          : undefined;
      if (isDevelopment) console.log('[createClassroom] Tạo lớp học thành công:', created);
      await mutate();
      return created ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setActionError(msg);
      if (isDevelopment) console.error('[createClassroom] Lỗi:', msg);
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  // Hàm tham gia lớp học bằng mã
  const joinClassroom = async (code: string): Promise<ClassroomResponse | null> => {
    try {
      setActionLoading(true);
      setActionError(null);
      if (isDevelopment) console.log('[joinClassroom] Tham gia lớp học với mã:', code);
      const response = await fetch('/api/classrooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });
      const result = (await response.json()) as unknown;
      if (!response.ok) {
        const message =
          typeof (result as { message?: unknown } | null)?.message === 'string'
            ? String((result as { message?: unknown }).message)
            : response.statusText;
        if (isDevelopment) console.error('[joinClassroom] Lỗi response:', message);
        throw new Error(message || 'Có lỗi xảy ra khi tham gia lớp học');
      }
      const payload = result && typeof result === 'object' ? (result as { data?: unknown }).data : undefined;
      const joined =
        payload && typeof payload === 'object' && 'classroom' in payload
          ? ((payload as { classroom?: unknown }).classroom as ClassroomResponse | undefined)
          : (payload as ClassroomResponse | undefined);
      if (isDevelopment) console.log('[joinClassroom] Tham gia thành công:', joined);
      await mutate();
      return joined ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setActionError(msg);
      if (isDevelopment) console.error('[joinClassroom] Lỗi:', msg);
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    classrooms,
    fetchClassrooms,
    createClassroom,
    joinClassroom,
    searchClassrooms: useCallback(
      async (
        params: SearchClassesQuery,
        options?: { signal?: AbortSignal }
      ): Promise<SearchClassesResponse> => {
        try {
          setActionError(null);
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
          setActionError(msg);
          throw err;
        }
      },
      []
    ),
    getClassroomById: useCallback(async (id: string): Promise<ClassroomResponse | null> => {
      try {
        setActionLoading(true);
        setActionError(null);
        const res = await fetch(`/api/classrooms/${id}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Không thể tải lớp học');
        }
        return data as ClassroomResponse;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
        setActionError(msg);
        if (isDevelopment) console.error('[getClassroomById] Lỗi:', msg);
        return null;
      } finally {
        setActionLoading(false);
      }
    }, []),
    isLoading,
    error,
  };
};