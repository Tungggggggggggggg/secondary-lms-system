import { useState, useCallback } from 'react';
import {
  DashboardStats,
  PerformanceData,
  UpcomingTask,
  RecentActivity,
  WeeklyGoal,
  Achievement,
} from '@/types/teacher-dashboard';

/**
 * Custom hook để quản lý state và fetch dữ liệu cho Teacher Dashboard
 */
export const useTeacherDashboard = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State cho từng phần dữ liệu
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [performance, setPerformance] = useState<PerformanceData[] | null>(null);
  const [tasks, setTasks] = useState<UpcomingTask[] | null>(null);
  const [activities, setActivities] = useState<RecentActivity[] | null>(null);
  const [goals, setGoals] = useState<{ goals: WeeklyGoal[]; streak: number } | null>(null);

  /**
   * Fetch thống kê tổng quan
   */
  const fetchStats = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('[useTeacherDashboard] Fetching stats...');

      const response = await fetch('/api/teachers/dashboard/stats');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || 'Không thể lấy thống kê');
      }

      setStats(result.data);
      console.log('[useTeacherDashboard] Stats fetched:', result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(msg);
      console.error('[useTeacherDashboard] Error fetching stats:', msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch hiệu suất giảng dạy
   */
  const fetchPerformance = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('[useTeacherDashboard] Fetching performance...');

      const response = await fetch('/api/teachers/dashboard/performance');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || 'Không thể lấy hiệu suất');
      }

      setPerformance(result.data);
      console.log('[useTeacherDashboard] Performance fetched:', result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(msg);
      console.error('[useTeacherDashboard] Error fetching performance:', msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch công việc sắp tới
   */
  const fetchTasks = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('[useTeacherDashboard] Fetching tasks...');

      const response = await fetch('/api/teachers/dashboard/tasks');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || 'Không thể lấy công việc');
      }

      setTasks(result.data);
      console.log('[useTeacherDashboard] Tasks fetched:', result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(msg);
      console.error('[useTeacherDashboard] Error fetching tasks:', msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch hoạt động gần đây
   */
  const fetchActivities = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('[useTeacherDashboard] Fetching activities...');

      const response = await fetch('/api/teachers/dashboard/activities');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || 'Không thể lấy hoạt động');
      }

      setActivities(result.data);
      console.log('[useTeacherDashboard] Activities fetched:', result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(msg);
      console.error('[useTeacherDashboard] Error fetching activities:', msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch mục tiêu tuần
   */
  const fetchGoals = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('[useTeacherDashboard] Fetching goals...');

      const response = await fetch('/api/teachers/dashboard/goals');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || 'Không thể lấy mục tiêu');
      }

      setGoals(result.data);
      console.log('[useTeacherDashboard] Goals fetched:', result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(msg);
      console.error('[useTeacherDashboard] Error fetching goals:', msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch tất cả dữ liệu dashboard
   */
  const fetchAllDashboardData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('[useTeacherDashboard] Fetching all dashboard data...');

      // Fetch tất cả dữ liệu song song
      await Promise.all([
        fetchStats(),
        fetchPerformance(),
        fetchTasks(),
        fetchActivities(),
        fetchGoals(),
      ]);

      console.log('[useTeacherDashboard] All dashboard data fetched successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(msg);
      console.error('[useTeacherDashboard] Error fetching all dashboard data:', msg);
    } finally {
      setIsLoading(false);
    }
  }, [fetchStats, fetchPerformance, fetchTasks, fetchActivities, fetchGoals]);

  return {
    // State
    stats,
    performance,
    tasks,
    activities,
    goals,
    isLoading,
    error,

    // Methods
    fetchStats,
    fetchPerformance,
    fetchTasks,
    fetchActivities,
    fetchGoals,
    fetchAllDashboardData,
  };
};
