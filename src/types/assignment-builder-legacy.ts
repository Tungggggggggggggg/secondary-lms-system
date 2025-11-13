/**
 * Legacy Types cho SmartAssignmentBuilder (deprecated)
 * Giữ lại để maintain backward compatibility
 * Sẽ được remove khi migrate hoàn toàn sang NewAssignmentBuilder
 */

import { AntiCheatConfig } from './exam-system';

// ===== LEGACY TYPES =====

/**
 * @deprecated Use new AssignmentData from assignment-builder.ts
 */
export type LegacyAssignmentType = 'QUIZ' | 'ESSAY' | 'MIXED';

/**
 * @deprecated Use QuizQuestion from assignment-builder.ts
 */
export interface LegacyQuizOption {
  label: string;
  content: string;
  isCorrect: boolean;
}

/**
 * @deprecated Use QuizQuestion from assignment-builder.ts
 */
export interface LegacyQuizQuestion {
  id: string;
  content: string;
  type: 'SINGLE' | 'MULTIPLE' | 'TRUE_FALSE' | 'FILL_BLANK';
  options: LegacyQuizOption[];
  order?: number;
  explanation?: string;
}

/**
 * @deprecated Use new workflow in NewAssignmentBuilder
 */
export interface EssayQuestion {
  id: string;
  content: string;
  type: 'SHORT_ANSWER' | 'LONG_ESSAY' | 'CODE';
  minWords?: number;
  maxWords?: number;
  rubric?: string[];
  allowFileUpload?: boolean;
}

/**
 * @deprecated Use new timing system
 */
export interface TimeSettings {
  openAt?: Date;
  dueDate?: Date;
  lockAt?: Date;
  timeLimitMinutes?: number;
  lateSubmissionAllowed?: boolean;
  gracePeriodMinutes?: number;
}

/**
 * @deprecated Use new AssignmentData structure
 */
export interface LegacyAssignmentData {
  title: string;
  description: string;
  type: LegacyAssignmentType;
  timeSettings: TimeSettings;
  quizQuestions?: LegacyQuizQuestion[];
  essayQuestion?: EssayQuestion;
  
  /** Cấu hình chống gian lận */
  antiCheatConfig?: AntiCheatConfig;
  
  /** Metadata bổ sung */
  metadata?: {
    estimatedDuration?: number; // phút
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    tags?: string[];
    instructions?: string;
  };
}

/**
 * @deprecated Use new validation system
 */
export interface LegacyValidationState {
  isValid: boolean;
  fieldErrors: Record<string, string>;
  generalErrors: string[];
}

// Export for backward compatibility
export type { LegacyAssignmentData as AssignmentDataLegacy };
export type { LegacyValidationState as ValidationStateLegacy };
