/**
 * Auto-save Hook for Assignment Builder
 * Tự động lưu draft và khôi phục dữ liệu
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AssignmentData } from '@/types/assignment-builder';

interface AutoSaveOptions {
  key: string;
  interval?: number; // milliseconds
  enabled?: boolean;
}

interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}

/**
 * Hook để auto-save assignment data
 */
export function useAutoSave(
  data: AssignmentData,
  options: AutoSaveOptions
) {
  const {
    key,
    interval = 30000, // 30 seconds
    enabled = true
  } = options;

  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastDataRef = useRef<string>('');

  // Save to localStorage
  const saveDraft = useCallback(async () => {
    if (!enabled) return;

    try {
      setState(prev => ({ ...prev, isSaving: true }));
      
      const draftData = {
        ...data,
        _metadata: {
          savedAt: new Date().toISOString(),
          version: '1.0'
        }
      };

      localStorage.setItem(`assignment_draft_${key}`, JSON.stringify(draftData));
      
      setState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false
      }));

      console.log(`[AutoSave] Draft saved for key: ${key}`);

    } catch (error) {
      console.error('[AutoSave] Error saving draft:', error);
      setState(prev => ({ ...prev, isSaving: false }));
    }
  }, [data, key, enabled]);

  // Load from localStorage
  const loadDraft = useCallback((): AssignmentData | null => {
    if (!enabled) return null;

    try {
      const saved = localStorage.getItem(`assignment_draft_${key}`);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      
      // Remove metadata before returning
      const { _metadata, ...assignmentData } = parsed;
      
      console.log(`[AutoSave] Draft loaded for key: ${key}`, _metadata);
      return assignmentData as AssignmentData;

    } catch (error) {
      console.error('[AutoSave] Error loading draft:', error);
      return null;
    }
  }, [key, enabled]);

  // Clear draft
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(`assignment_draft_${key}`);
      setState(prev => ({
        ...prev,
        lastSaved: null,
        hasUnsavedChanges: false
      }));
      console.log(`[AutoSave] Draft cleared for key: ${key}`);
    } catch (error) {
      console.error('[AutoSave] Error clearing draft:', error);
    }
  }, [key]);

  // Check if data has changed
  useEffect(() => {
    const currentDataString = JSON.stringify(data);
    
    if (lastDataRef.current && lastDataRef.current !== currentDataString) {
      setState(prev => ({ ...prev, hasUnsavedChanges: true }));
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout for auto-save
      if (enabled) {
        timeoutRef.current = setTimeout(() => {
          saveDraft();
        }, interval);
      }
    }
    
    lastDataRef.current = currentDataString;
  }, [data, interval, enabled, saveDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges && enabled) {
        saveDraft();
        e.preventDefault();
        e.returnValue = 'Bạn có thay đổi chưa được lưu. Bạn có chắc muốn rời khỏi trang?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges, enabled, saveDraft]);

  return {
    ...state,
    saveDraft,
    loadDraft,
    clearDraft
  };
}

/**
 * Hook để quản lý danh sách drafts
 */
export function useDraftManager() {
  const [drafts, setDrafts] = useState<Array<{
    key: string;
    title: string;
    type: string;
    savedAt: string;
  }>>([]);

  // Load all drafts
  const loadAllDrafts = useCallback(() => {
    try {
      const allDrafts: typeof drafts = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('assignment_draft_')) {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            allDrafts.push({
              key: key.replace('assignment_draft_', ''),
              title: parsed.title || 'Bài tập chưa có tên',
              type: parsed.type || 'ESSAY',
              savedAt: parsed._metadata?.savedAt || new Date().toISOString()
            });
          }
        }
      }
      
      // Sort by saved date (newest first)
      allDrafts.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      
      setDrafts(allDrafts);
      console.log(`[DraftManager] Loaded ${allDrafts.length} drafts`);
      
    } catch (error) {
      console.error('[DraftManager] Error loading drafts:', error);
    }
  }, []);

  // Delete specific draft
  const deleteDraft = useCallback((key: string) => {
    try {
      localStorage.removeItem(`assignment_draft_${key}`);
      setDrafts(prev => prev.filter(d => d.key !== key));
      console.log(`[DraftManager] Draft deleted: ${key}`);
    } catch (error) {
      console.error('[DraftManager] Error deleting draft:', error);
    }
  }, []);

  // Clear all drafts
  const clearAllDrafts = useCallback(() => {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('assignment_draft_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      setDrafts([]);
      
      console.log(`[DraftManager] Cleared ${keysToRemove.length} drafts`);
      
    } catch (error) {
      console.error('[DraftManager] Error clearing all drafts:', error);
    }
  }, []);

  // Load drafts on mount
  useEffect(() => {
    loadAllDrafts();
  }, [loadAllDrafts]);

  return {
    drafts,
    loadAllDrafts,
    deleteDraft,
    clearAllDrafts
  };
}

/**
 * Utility function để generate unique key cho draft
 */
export function generateDraftKey(prefix: string = 'assignment'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
}
