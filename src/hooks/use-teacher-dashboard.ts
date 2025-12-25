import useSWR from "swr";
import {
  DashboardStats,
  PerformanceData,
  UpcomingTask,
  RecentActivity,
  WeeklyGoal,
} from "@/types/teacher-dashboard";

type ApiEnvelope<T> = { data: T; message?: string };

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const maybeMessage = (payload as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
}

async function fetchDashboardData<T>(url: string, fallbackMessage: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const payload = (await res.json()) as unknown;

  if (!res.ok) {
    throw new Error(getErrorMessage(payload, fallbackMessage));
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiEnvelope<T>).data;
  }

  throw new Error(fallbackMessage);
}

function toErrorString(err: unknown): string | null {
  if (!err) return null;
  if (err instanceof Error) return err.message;
  return String(err);
}

export const useTeacherDashboardStats = () => {
  const { data, error, isLoading, mutate } = useSWR<DashboardStats>(
    "/api/teachers/dashboard/stats",
    (url: string) => fetchDashboardData<DashboardStats>(url, "Không thể lấy thống kê"),
    {
      shouldRetryOnError: false,
      revalidateOnFocus: false,
      dedupingInterval: 15000,
    }
  );

  return {
    stats: data ?? null,
    isLoading,
    error: toErrorString(error),
    fetchStats: async () => {
      await mutate();
    },
  };
};

export const useTeacherDashboardPerformance = () => {
  const { data, error, isLoading, mutate } = useSWR<PerformanceData[]>(
    "/api/teachers/dashboard/performance",
    (url: string) => fetchDashboardData<PerformanceData[]>(url, "Không thể lấy hiệu suất"),
    {
      shouldRetryOnError: false,
      revalidateOnFocus: false,
      dedupingInterval: 15000,
    }
  );

  return {
    performance: data ?? null,
    isLoading,
    error: toErrorString(error),
    fetchPerformance: async () => {
      await mutate();
    },
  };
};

export const useTeacherDashboardTasks = () => {
  const { data, error, isLoading, mutate } = useSWR<UpcomingTask[]>(
    "/api/teachers/dashboard/tasks",
    (url: string) => fetchDashboardData<UpcomingTask[]>(url, "Không thể lấy công việc"),
    {
      shouldRetryOnError: false,
      revalidateOnFocus: false,
      dedupingInterval: 15000,
    }
  );

  return {
    tasks: data ?? null,
    isLoading,
    error: toErrorString(error),
    fetchTasks: async () => {
      await mutate();
    },
  };
};

export const useTeacherDashboardActivities = () => {
  const { data, error, isLoading, mutate } = useSWR<RecentActivity[]>(
    "/api/teachers/dashboard/activities",
    (url: string) => fetchDashboardData<RecentActivity[]>(url, "Không thể lấy hoạt động"),
    {
      shouldRetryOnError: false,
      revalidateOnFocus: false,
      dedupingInterval: 15000,
    }
  );

  return {
    activities: data ?? null,
    isLoading,
    error: toErrorString(error),
    fetchActivities: async () => {
      await mutate();
    },
  };
};

export const useTeacherDashboardGoals = () => {
  const { data, error, isLoading, mutate } = useSWR<{ goals: WeeklyGoal[]; streak: number }>(
    "/api/teachers/dashboard/goals",
    (url: string) =>
      fetchDashboardData<{ goals: WeeklyGoal[]; streak: number }>(url, "Không thể lấy mục tiêu"),
    {
      shouldRetryOnError: false,
      revalidateOnFocus: false,
      dedupingInterval: 15000,
    }
  );

  return {
    goals: data ?? null,
    isLoading,
    error: toErrorString(error),
    fetchGoals: async () => {
      await mutate();
    },
  };
};
