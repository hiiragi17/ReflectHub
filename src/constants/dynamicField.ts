export const DYNAMIC_FIELD_CONSTANTS = {
  DEFAULT_MAX_LENGTH: 1000,
  NEAR_LIMIT_THRESHOLD: 0.8,
  
  LABELS: {
    NEAR_LIMIT_WARNING: '文字数制限に近づいています',
    // 色や記号だけに頼らず、文字で必須と分かるようにする
    REQUIRED: '必須',
  },
  
  CLASS_NAMES: {
    LABEL: 'text-sm font-semibold text-gray-700',
    REQUIRED_INDICATOR:
      'ml-2 rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700',
    DESCRIPTION: 'text-xs text-gray-600',
    CHARACTER_COUNT: 'text-xs',
    CHARACTER_COUNT_NEAR_LIMIT: 'text-red-600 font-semibold',
    CHARACTER_COUNT_NORMAL: 'text-gray-500',
    TEXTAREA: 'min-h-24 resize-none border-gray-300',
    WARNING_MESSAGE: 'text-xs text-red-600',
  },
};