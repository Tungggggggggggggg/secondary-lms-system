/**
 * Hook cho Bulk Operations
 * Quản lý state và API calls cho các thao tác hàng loạt
 */

"use client";

import React, { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  BulkClassroomInput, 
  BulkClassroomResult, 
  BulkOperationProgress,
  BulkClassroomApiResponse,
  BulkProgressApiResponse
} from "@/types/bulk-operations";

export interface UseBulkOperationsReturn {
  // State
  isLoading: boolean;
  error: string | null;
  progress: BulkOperationProgress | null;
  
  // Actions
  createBulkClassroom: (input: BulkClassroomInput) => Promise<BulkClassroomResult | null>;
  getProgress: (operationId: string) => Promise<BulkOperationProgress | null>;
  validateBulkClassroom: (input: BulkClassroomInput) => Promise<any>;
  downloadTemplate: (type: 'student' | 'teacher') => Promise<void>;
  
  // Utils
  clearError: () => void;
  reset: () => void;
}

export function useBulkOperations(): UseBulkOperationsReturn {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null);

  // ============================================
  // Create Bulk Classroom
  // ============================================

  const createBulkClassroom = useCallback(async (
    input: BulkClassroomInput
  ): Promise<BulkClassroomResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[USE_BULK_OPERATIONS] Creating bulk classroom:', input.name);

      const response = await fetch('/api/admin/bulk/classrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const result: BulkClassroomApiResponse = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error || result.errors?.join(', ') || 'Có lỗi xảy ra';
        throw new Error(errorMessage);
      }

      console.log('[USE_BULK_OPERATIONS] Bulk classroom created successfully');

      toast({
        title: "Tạo lớp học thành công!",
        description: `Lớp "${input.name}" đã được tạo với ${result.data?.summary.successCount || 0} học sinh`,
        variant: "success"
      });

      return result.data || null;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      console.error('[USE_BULK_OPERATIONS] Error creating bulk classroom:', err);
      
      setError(errorMessage);
      toast({
        title: "Lỗi tạo lớp học",
        description: errorMessage,
        variant: "destructive"
      });

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // ============================================
  // Get Progress
  // ============================================

  const getProgress = useCallback(async (
    operationId: string
  ): Promise<BulkOperationProgress | null> => {
    try {
      console.log('[USE_BULK_OPERATIONS] Getting progress for:', operationId);

      const response = await fetch(`/api/admin/bulk/classrooms/${operationId}`);
      const result: BulkProgressApiResponse = await response.json();

      if (!response.ok || !result.success) {
        console.warn('[USE_BULK_OPERATIONS] Progress not found:', result.error);
        return null;
      }

      setProgress(result.data || null);
      return result.data || null;

    } catch (err) {
      console.error('[USE_BULK_OPERATIONS] Error getting progress:', err);
      return null;
    }
  }, []);

  // ============================================
  // Validate Bulk Classroom
  // ============================================

  const validateBulkClassroom = useCallback(async (
    input: BulkClassroomInput
  ): Promise<any> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[USE_BULK_OPERATIONS] Validating bulk classroom:', input.name);

      const response = await fetch('/api/admin/bulk/classrooms', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'Validation failed';
        throw new Error(errorMessage);
      }

      console.log('[USE_BULK_OPERATIONS] Validation successful');
      return result.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation error';
      console.error('[USE_BULK_OPERATIONS] Validation error:', err);
      
      setError(errorMessage);
      toast({
        title: "Lỗi validation",
        description: errorMessage,
        variant: "destructive"
      });

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // ============================================
  // Download Template
  // ============================================

  const downloadTemplate = useCallback(async (
    type: 'student' | 'teacher'
  ): Promise<void> => {
    try {
      console.log('[USE_BULK_OPERATIONS] Downloading template:', type);

      const response = await fetch(`/api/admin/bulk/templates?type=${type}`);
      
      if (!response.ok) {
        throw new Error('Không thể tải template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-template.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Tải template thành công",
        description: `File ${type}-template.csv đã được tải xuống`,
        variant: "success"
      });

    } catch (err) {
      console.error('[USE_BULK_OPERATIONS] Error downloading template:', err);
      
      toast({
        title: "Lỗi tải template",
        description: err instanceof Error ? err.message : 'Không thể tải file',
        variant: "destructive"
      });
    }
  }, [toast]);

  // ============================================
  // Utilities
  // ============================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setProgress(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    progress,
    
    // Actions
    createBulkClassroom,
    getProgress,
    validateBulkClassroom,
    downloadTemplate,
    
    // Utils
    clearError,
    reset,
  };
}

// ============================================
// Progress Polling Hook
// ============================================

export function useBulkOperationProgress(operationId: string | null) {
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  const pollProgress = useCallback(async () => {
    if (!operationId || !isPolling) return;

    try {
      const response = await fetch(`/api/admin/bulk/classrooms/${operationId}`);
      const result: BulkProgressApiResponse = await response.json();

      if (response.ok && result.success && result.data) {
        setProgress(result.data);
        
        // Stop polling when completed or failed
        if (result.data.status === 'COMPLETED' || result.data.status === 'FAILED') {
          setIsPolling(false);
        }
      } else {
        setIsPolling(false);
      }
    } catch (error) {
      console.error('[USE_BULK_PROGRESS] Error polling progress:', error);
      setIsPolling(false);
    }
  }, [operationId, isPolling]);

  // Auto polling effect
  React.useEffect(() => {
    if (!operationId || !isPolling) return;

    // Poll immediately
    pollProgress();

    // Then poll every 2 seconds
    const interval = setInterval(pollProgress, 2000);

    return () => clearInterval(interval);
  }, [operationId, isPolling, pollProgress]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(() => {
    setIsPolling(true);
  }, []);

  return {
    progress,
    isPolling,
    stopPolling,
    startPolling,
  };
}

