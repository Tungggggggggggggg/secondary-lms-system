/**
 * Fallback Configuration System
 * Quản lý cấu hình fallback cho Smart Exam System
 */

import { FallbackConfig, AntiCheatConfig, EXAM_CONSTANTS } from '@/types/exam-system'

/**
 * Predefined fallback configurations
 */
export const FALLBACK_PRESETS = {
  STRICT: {
    gracePeriodMinutes: 1,
    maxReconnects: 1,
    autoApproveGrace: false,
    autoSaveInterval: 5,
    suspiciousThreshold: 2,
    offlineMode: false
  } as FallbackConfig,

  BALANCED: {
    gracePeriodMinutes: 3,
    maxReconnects: 2,
    autoApproveGrace: true,
    autoSaveInterval: 10,
    suspiciousThreshold: 3,
    offlineMode: false
  } as FallbackConfig,

  LENIENT: {
    gracePeriodMinutes: 5,
    maxReconnects: 3,
    autoApproveGrace: true,
    autoSaveInterval: 15,
    suspiciousThreshold: 5,
    offlineMode: false
  } as FallbackConfig,

  DEVELOPMENT: {
    gracePeriodMinutes: 10,
    maxReconnects: 10,
    autoApproveGrace: true,
    autoSaveInterval: 5,
    suspiciousThreshold: 100,
    offlineMode: true
  } as FallbackConfig
} as const

/**
 * Predefined anti-cheat configurations
 */
export const ANTI_CHEAT_PRESETS = {
  BASIC: {
    shuffleQuestions: true,
    shuffleOptions: false,
    singleQuestionMode: false,
    requireFullscreen: false,
    detectTabSwitch: false,
    disableCopyPaste: false,
    preset: 'BASIC'
  } as AntiCheatConfig,

  MEDIUM: {
    shuffleQuestions: true,
    shuffleOptions: true,
    singleQuestionMode: false,
    requireFullscreen: false,
    detectTabSwitch: true,
    disableCopyPaste: true,
    preset: 'MEDIUM'
  } as AntiCheatConfig,

  ADVANCED: {
    shuffleQuestions: true,
    shuffleOptions: true,
    singleQuestionMode: true,
    timePerQuestion: 300, // 5 phút mỗi câu
    requireFullscreen: true,
    detectTabSwitch: true,
    disableCopyPaste: true,
    preset: 'ADVANCED'
  } as AntiCheatConfig,

  CUSTOM: {
    shuffleQuestions: false,
    shuffleOptions: false,
    singleQuestionMode: false,
    requireFullscreen: false,
    detectTabSwitch: false,
    disableCopyPaste: false,
    preset: 'CUSTOM'
  } as AntiCheatConfig
} as const

/**
 * Configuration validation rules
 */
export interface ConfigValidationRule {
  field: string
  min?: number
  max?: number
  required?: boolean
  type?: 'number' | 'boolean' | 'string'
  allowedValues?: any[]
  customValidator?: (value: any) => boolean
  errorMessage?: string
}

/**
 * Fallback config validation rules
 */
export const FALLBACK_VALIDATION_RULES: ConfigValidationRule[] = [
  {
    field: 'gracePeriodMinutes',
    type: 'number',
    min: 0,
    max: 30,
    required: true,
    errorMessage: 'Grace period phải từ 0-30 phút'
  },
  {
    field: 'maxReconnects',
    type: 'number',
    min: 0,
    max: 10,
    required: true,
    errorMessage: 'Số lần reconnect tối đa phải từ 0-10'
  },
  {
    field: 'autoApproveGrace',
    type: 'boolean',
    required: true,
    errorMessage: 'Auto approve grace phải là boolean'
  },
  {
    field: 'autoSaveInterval',
    type: 'number',
    min: 1,
    max: 300,
    required: true,
    errorMessage: 'Auto save interval phải từ 1-300 giây'
  },
  {
    field: 'suspiciousThreshold',
    type: 'number',
    min: 1,
    max: 100,
    required: true,
    errorMessage: 'Suspicious threshold phải từ 1-100'
  },
  {
    field: 'offlineMode',
    type: 'boolean',
    required: true,
    errorMessage: 'Offline mode phải là boolean'
  }
]

/**
 * Anti-cheat config validation rules
 */
export const ANTI_CHEAT_VALIDATION_RULES: ConfigValidationRule[] = [
  {
    field: 'shuffleQuestions',
    type: 'boolean',
    required: true,
    errorMessage: 'Shuffle questions phải là boolean'
  },
  {
    field: 'shuffleOptions',
    type: 'boolean',
    required: true,
    errorMessage: 'Shuffle options phải là boolean'
  },
  {
    field: 'singleQuestionMode',
    type: 'boolean',
    required: true,
    errorMessage: 'Single question mode phải là boolean'
  },
  {
    field: 'timePerQuestion',
    type: 'number',
    min: 10,
    max: 3600,
    required: false,
    errorMessage: 'Time per question phải từ 10-3600 giây'
  },
  {
    field: 'requireFullscreen',
    type: 'boolean',
    required: true,
    errorMessage: 'Require fullscreen phải là boolean'
  },
  {
    field: 'detectTabSwitch',
    type: 'boolean',
    required: true,
    errorMessage: 'Detect tab switch phải là boolean'
  },
  {
    field: 'disableCopyPaste',
    type: 'boolean',
    required: true,
    errorMessage: 'Disable copy paste phải là boolean'
  },
  {
    field: 'preset',
    type: 'string',
    allowedValues: ['BASIC', 'MEDIUM', 'ADVANCED', 'CUSTOM'],
    required: true,
    errorMessage: 'Preset phải là một trong: BASIC, MEDIUM, ADVANCED, CUSTOM'
  }
]

/**
 * Configuration Manager
 */
export class ConfigManager {
  /**
   * Validate fallback configuration
   */
  static validateFallbackConfig(config: Partial<FallbackConfig>): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    for (const rule of FALLBACK_VALIDATION_RULES) {
      const value = (config as any)[rule.field]
      const validation = this.validateField(value, rule)
      
      if (!validation.isValid) {
        errors.push(validation.error || `Invalid ${rule.field}`)
      }
      
      if (validation.warning) {
        warnings.push(validation.warning)
      }
    }

    // Custom validations
    if (config.gracePeriodMinutes && config.autoSaveInterval) {
      if (config.gracePeriodMinutes * 60 < config.autoSaveInterval * 2) {
        warnings.push('Grace period quá ngắn so với auto-save interval')
      }
    }

    if (config.maxReconnects === 0 && config.gracePeriodMinutes && config.gracePeriodMinutes > 0) {
      warnings.push('Grace period sẽ không có tác dụng khi maxReconnects = 0')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate anti-cheat configuration
   */
  static validateAntiCheatConfig(config: Partial<AntiCheatConfig>): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    for (const rule of ANTI_CHEAT_VALIDATION_RULES) {
      const value = (config as any)[rule.field]
      const validation = this.validateField(value, rule)
      
      if (!validation.isValid) {
        errors.push(validation.error || `Invalid ${rule.field}`)
      }
      
      if (validation.warning) {
        warnings.push(validation.warning)
      }
    }

    // Custom validations
    if (config.singleQuestionMode && !config.shuffleQuestions) {
      warnings.push('Single question mode thường được dùng cùng với shuffle questions')
    }

    if (config.requireFullscreen && !config.detectTabSwitch) {
      warnings.push('Nên bật detect tab switch khi require fullscreen')
    }

    if (config.timePerQuestion && config.timePerQuestion < 30) {
      warnings.push('Thời gian mỗi câu quá ngắn (<30 giây)')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate individual field
   */
  private static validateField(value: any, rule: ConfigValidationRule): {
    isValid: boolean
    error?: string
    warning?: string
  } {
    // Check required
    if (rule.required && (value === undefined || value === null)) {
      return {
        isValid: false,
        error: rule.errorMessage || `${rule.field} is required`
      }
    }

    // Skip validation if not required and value is empty
    if (!rule.required && (value === undefined || value === null)) {
      return { isValid: true }
    }

    // Check type
    if (rule.type && typeof value !== rule.type) {
      return {
        isValid: false,
        error: rule.errorMessage || `${rule.field} must be ${rule.type}`
      }
    }

    // Check min/max for numbers
    if (rule.type === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return {
          isValid: false,
          error: rule.errorMessage || `${rule.field} must be >= ${rule.min}`
        }
      }
      
      if (rule.max !== undefined && value > rule.max) {
        return {
          isValid: false,
          error: rule.errorMessage || `${rule.field} must be <= ${rule.max}`
        }
      }
    }

    // Check allowed values
    if (rule.allowedValues && !rule.allowedValues.includes(value)) {
      return {
        isValid: false,
        error: rule.errorMessage || `${rule.field} must be one of: ${rule.allowedValues.join(', ')}`
      }
    }

    // Custom validator
    if (rule.customValidator && !rule.customValidator(value)) {
      return {
        isValid: false,
        error: rule.errorMessage || `${rule.field} failed custom validation`
      }
    }

    return { isValid: true }
  }

  /**
   * Merge configurations with defaults
   */
  static mergeFallbackConfig(
    userConfig: Partial<FallbackConfig>,
    preset?: keyof typeof FALLBACK_PRESETS
  ): FallbackConfig {
    const baseConfig = preset ? FALLBACK_PRESETS[preset] : EXAM_CONSTANTS.DEFAULT_FALLBACK_CONFIG
    
    return {
      ...baseConfig,
      ...userConfig
    }
  }

  /**
   * Merge anti-cheat configurations
   */
  static mergeAntiCheatConfig(
    userConfig: Partial<AntiCheatConfig>,
    preset?: keyof typeof ANTI_CHEAT_PRESETS
  ): AntiCheatConfig {
    const baseConfig = preset ? ANTI_CHEAT_PRESETS[preset] : EXAM_CONSTANTS.DEFAULT_ANTI_CHEAT_CONFIG
    
    return {
      ...baseConfig,
      ...userConfig
    }
  }

  /**
   * Get recommended configuration based on exam type
   */
  static getRecommendedConfig(examType: 'quiz' | 'exam' | 'homework' | 'project'): {
    fallback: FallbackConfig
    antiCheat: AntiCheatConfig
  } {
    switch (examType) {
      case 'quiz':
        return {
          fallback: FALLBACK_PRESETS.BALANCED,
          antiCheat: ANTI_CHEAT_PRESETS.MEDIUM
        }
      
      case 'exam':
        return {
          fallback: FALLBACK_PRESETS.STRICT,
          antiCheat: ANTI_CHEAT_PRESETS.ADVANCED
        }
      
      case 'homework':
        return {
          fallback: FALLBACK_PRESETS.LENIENT,
          antiCheat: ANTI_CHEAT_PRESETS.BASIC
        }
      
      case 'project':
        return {
          fallback: FALLBACK_PRESETS.LENIENT,
          antiCheat: ANTI_CHEAT_PRESETS.BASIC
        }
      
      default:
        return {
          fallback: FALLBACK_PRESETS.BALANCED,
          antiCheat: ANTI_CHEAT_PRESETS.MEDIUM
        }
    }
  }

  /**
   * Create configuration summary for UI
   */
  static createConfigSummary(
    fallbackConfig: FallbackConfig,
    antiCheatConfig: AntiCheatConfig
  ): {
    fallback: { label: string; value: string; severity: 'low' | 'medium' | 'high' }[]
    antiCheat: { label: string; value: string; enabled: boolean }[]
    overallSecurity: 'low' | 'medium' | 'high'
  } {
    const fallbackSummary = [
      {
        label: 'Grace Period',
        value: `${fallbackConfig.gracePeriodMinutes} phút`,
        severity: (fallbackConfig.gracePeriodMinutes <= 2 ? 'high' : 
                 fallbackConfig.gracePeriodMinutes <= 5 ? 'medium' : 'low') as 'low' | 'medium' | 'high'
      },
      {
        label: 'Max Reconnects',
        value: `${fallbackConfig.maxReconnects} lần`,
        severity: (fallbackConfig.maxReconnects <= 1 ? 'high' : 
                 fallbackConfig.maxReconnects <= 3 ? 'medium' : 'low') as 'low' | 'medium' | 'high'
      },
      {
        label: 'Auto-save',
        value: `${fallbackConfig.autoSaveInterval}s`,
        severity: (fallbackConfig.autoSaveInterval <= 10 ? 'high' : 
                 fallbackConfig.autoSaveInterval <= 30 ? 'medium' : 'low') as 'low' | 'medium' | 'high'
      }
    ]

    const antiCheatSummary = [
      {
        label: 'Xáo câu hỏi',
        value: 'Thứ tự câu hỏi khác nhau cho mỗi học sinh',
        enabled: antiCheatConfig.shuffleQuestions
      },
      {
        label: 'Xáo đáp án',
        value: 'Thứ tự đáp án khác nhau cho mỗi học sinh',
        enabled: antiCheatConfig.shuffleOptions
      },
      {
        label: 'Từng câu một',
        value: 'Hiển thị từng câu, không cho quay lại',
        enabled: antiCheatConfig.singleQuestionMode
      },
      {
        label: 'Fullscreen',
        value: 'Bắt buộc chế độ toàn màn hình',
        enabled: antiCheatConfig.requireFullscreen
      },
      {
        label: 'Phát hiện chuyển tab',
        value: 'Cảnh báo khi học sinh chuyển tab',
        enabled: antiCheatConfig.detectTabSwitch
      },
      {
        label: 'Vô hiệu hóa copy/paste',
        value: 'Không cho phép sao chép dán',
        enabled: antiCheatConfig.disableCopyPaste
      }
    ]

    // Calculate overall security level
    const enabledFeatures = antiCheatSummary.filter(item => item.enabled).length
    const strictFallback = fallbackConfig.gracePeriodMinutes <= 2 && fallbackConfig.maxReconnects <= 1
    
    let overallSecurity: 'low' | 'medium' | 'high'
    if (enabledFeatures >= 4 && strictFallback) {
      overallSecurity = 'high'
    } else if (enabledFeatures >= 2 || strictFallback) {
      overallSecurity = 'medium'
    } else {
      overallSecurity = 'low'
    }

    return {
      fallback: fallbackSummary,
      antiCheat: antiCheatSummary,
      overallSecurity
    }
  }

  /**
   * Export configuration to JSON
   */
  static exportConfig(
    fallbackConfig: FallbackConfig,
    antiCheatConfig: AntiCheatConfig
  ): string {
    const config = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      fallback: fallbackConfig,
      antiCheat: antiCheatConfig
    }
    
    return JSON.stringify(config, null, 2)
  }

  /**
   * Import configuration from JSON
   */
  static importConfig(jsonString: string): {
    success: boolean
    fallbackConfig?: FallbackConfig
    antiCheatConfig?: AntiCheatConfig
    errors: string[]
  } {
    try {
      const config = JSON.parse(jsonString)
      
      if (!config.fallback || !config.antiCheat) {
        return {
          success: false,
          errors: ['Invalid config format: missing fallback or antiCheat']
        }
      }

      // Validate imported configs
      const fallbackValidation = this.validateFallbackConfig(config.fallback)
      const antiCheatValidation = this.validateAntiCheatConfig(config.antiCheat)

      const errors = [
        ...fallbackValidation.errors,
        ...antiCheatValidation.errors
      ]

      if (errors.length > 0) {
        return {
          success: false,
          errors
        }
      }

      return {
        success: true,
        fallbackConfig: config.fallback,
        antiCheatConfig: config.antiCheat,
        errors: []
      }

    } catch (error) {
      return {
        success: false,
        errors: ['Invalid JSON format']
      }
    }
  }
}

/**
 * Utility functions
 */

/**
 * Check if configuration is production-ready
 */
export const isProductionReady = (
  fallbackConfig: FallbackConfig,
  antiCheatConfig: AntiCheatConfig
): boolean => {
  // Basic security requirements for production
  return (
    fallbackConfig.maxReconnects <= 3 &&
    fallbackConfig.gracePeriodMinutes <= 5 &&
    fallbackConfig.autoSaveInterval <= 30 &&
    (antiCheatConfig.shuffleQuestions || antiCheatConfig.shuffleOptions)
  )
}

/**
 * Get security score (0-100)
 */
export const calculateSecurityScore = (
  fallbackConfig: FallbackConfig,
  antiCheatConfig: AntiCheatConfig
): number => {
  let score = 0

  // Fallback security (40 points max)
  score += Math.max(0, 10 - fallbackConfig.gracePeriodMinutes) * 2 // 0-20 points
  score += Math.max(0, 5 - fallbackConfig.maxReconnects) * 3 // 0-15 points
  score += fallbackConfig.autoApproveGrace ? 0 : 5 // 5 points for manual approval

  // Anti-cheat security (60 points max)
  if (antiCheatConfig.shuffleQuestions) score += 10
  if (antiCheatConfig.shuffleOptions) score += 10
  if (antiCheatConfig.singleQuestionMode) score += 15
  if (antiCheatConfig.requireFullscreen) score += 10
  if (antiCheatConfig.detectTabSwitch) score += 10
  if (antiCheatConfig.disableCopyPaste) score += 5

  return Math.min(100, score)
}

export default ConfigManager
