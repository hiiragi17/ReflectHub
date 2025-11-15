/**
 * Change History Service
 *
 * Tracks and manages changes to reflections
 * Provides diff calculation, change summary, and history management
 */

export interface FieldChange {
  fieldId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
}

export interface ReflectionChange {
  reflectionId: string;
  timestamp: string;
  changedBy: string;
  changes: FieldChange[];
  summary: string;
}

export interface ChangeHistory {
  reflectionId: string;
  changes: ReflectionChange[];
  lastModified: string;
  changeCount: number;
}

/**
 * Compare two objects and return differences
 */
export const calculateDiff = (
  oldData: Record<string, string>,
  newData: Record<string, string>
): FieldChange[] => {
  const changes: FieldChange[] = [];
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  allKeys.forEach((key) => {
    const oldValue = oldData[key] || '';
    const newValue = newData[key] || '';

    if (oldValue !== newValue) {
      changes.push({
        fieldId: key,
        fieldName: key,
        oldValue,
        newValue,
      });
    }
  });

  return changes;
};

/**
 * Generate summary of changes
 */
export const generateChangeSummary = (changes: FieldChange[]): string => {
  if (changes.length === 0) {
    return '変更なし';
  }

  if (changes.length === 1) {
    return `${changes[0].fieldName} を更新`;
  }

  return `${changes.length} 個のフィールドを更新`;
};

/**
 * Create change record
 */
export const createChangeRecord = (
  reflectionId: string,
  userId: string,
  oldContent: Record<string, string>,
  newContent: Record<string, string>
): ReflectionChange => {
  const changes = calculateDiff(oldContent, newContent);
  const summary = generateChangeSummary(changes);

  return {
    reflectionId,
    timestamp: new Date().toISOString(),
    changedBy: userId,
    changes,
    summary,
  };
};

/**
 * Check if content has changed
 */
export const hasContentChanged = (
  oldContent: Record<string, string>,
  newContent: Record<string, string>
): boolean => {
  return calculateDiff(oldContent, newContent).length > 0;
};

/**
 * Get change statistics
 */
export interface ChangeStats {
  totalChanges: number;
  changedFields: string[];
  lastChangeTime: string;
  changeFrequency: 'once' | 'multiple' | 'frequent';
}

export const getChangeStats = (history: ReflectionChange[]): ChangeStats => {
  const totalChanges = history.length;
  const changedFields = new Set<string>();

  history.forEach((change) => {
    change.changes.forEach((field) => {
      changedFields.add(field.fieldId);
    });
  });

  const lastChangeTime =
    history.length > 0 ? history[history.length - 1].timestamp : '';

  let changeFrequency: 'once' | 'multiple' | 'frequent' = 'once';
  if (totalChanges > 1) {
    changeFrequency = 'multiple';
  }
  if (totalChanges > 5) {
    changeFrequency = 'frequent';
  }

  return {
    totalChanges,
    changedFields: Array.from(changedFields),
    lastChangeTime,
    changeFrequency,
  };
};

/**
 * Format change history for display
 */
export const formatChangeHistory = (
  history: ReflectionChange[]
): string => {
  if (history.length === 0) {
    return '変更履歴なし';
  }

  return history
    .map((change) => {
      return `${change.timestamp.split('T')[0]} - ${change.summary}`;
    })
    .join('\n');
};

/**
 * Track change in local storage (browser-side)
 */
export const trackChangeLocally = (
  reflectionId: string,
  change: ReflectionChange
): void => {
  try {
    const storageKey = `reflection_changes_${reflectionId}`;
    const existingChanges = localStorage.getItem(storageKey);
    const changes = existingChanges ? JSON.parse(existingChanges) : [];

    changes.push(change);

    // Keep only last 50 changes per reflection
    if (changes.length > 50) {
      changes.shift();
    }

    localStorage.setItem(storageKey, JSON.stringify(changes));
  } catch (error) {
    console.error('Failed to track change locally:', error);
  }
};

/**
 * Get local change history
 */
export const getLocalChangeHistory = (reflectionId: string): ReflectionChange[] => {
  try {
    const storageKey = `reflection_changes_${reflectionId}`;
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get local change history:', error);
    return [];
  }
};

/**
 * Clear local change history
 */
export const clearLocalChangeHistory = (reflectionId: string): void => {
  try {
    const storageKey = `reflection_changes_${reflectionId}`;
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Failed to clear change history:', error);
  }
};

export const changeHistoryService = {
  calculateDiff,
  generateChangeSummary,
  createChangeRecord,
  hasContentChanged,
  getChangeStats,
  formatChangeHistory,
  trackChangeLocally,
  getLocalChangeHistory,
  clearLocalChangeHistory,
};
