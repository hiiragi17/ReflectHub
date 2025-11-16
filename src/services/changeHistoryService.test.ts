import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  calculateDiff,
  generateChangeSummary,
  createChangeRecord,
  hasContentChanged,
  getChangeStats,
  formatChangeHistory,
  trackChangeLocally,
  getLocalChangeHistory,
  clearLocalChangeHistory,
  type FieldChange,
  type ReflectionChange,
} from './changeHistoryService';

describe('changeHistoryService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('calculateDiff', () => {
    it('should return empty array when content is identical', () => {
      const oldData = { field1: 'value1', field2: 'value2' };
      const newData = { field1: 'value1', field2: 'value2' };

      const diff = calculateDiff(oldData, newData);

      expect(diff).toHaveLength(0);
    });

    it('should detect field value changes', () => {
      const oldData = { field1: 'old value', field2: 'value2' };
      const newData = { field1: 'new value', field2: 'value2' };

      const diff = calculateDiff(oldData, newData);

      expect(diff).toHaveLength(1);
      expect(diff[0].fieldId).toBe('field1');
      expect(diff[0].oldValue).toBe('old value');
      expect(diff[0].newValue).toBe('new value');
    });

    it('should detect new fields', () => {
      const oldData = { field1: 'value1' };
      const newData = { field1: 'value1', field2: 'new field' };

      const diff = calculateDiff(oldData, newData);

      expect(diff).toHaveLength(1);
      expect(diff[0].fieldId).toBe('field2');
      expect(diff[0].oldValue).toBe('');
      expect(diff[0].newValue).toBe('new field');
    });

    it('should detect removed fields', () => {
      const oldData = { field1: 'value1', field2: 'value2' };
      const newData = { field1: 'value1' };

      const diff = calculateDiff(oldData, newData);

      expect(diff).toHaveLength(1);
      expect(diff[0].fieldId).toBe('field2');
      expect(diff[0].oldValue).toBe('value2');
      expect(diff[0].newValue).toBe('');
    });

    it('should handle multiple changes', () => {
      const oldData = { field1: 'a', field2: 'b', field3: 'c' };
      const newData = { field1: 'x', field2: 'b', field3: 'z' };

      const diff = calculateDiff(oldData, newData);

      expect(diff).toHaveLength(2);
      expect(diff.map((d) => d.fieldId)).toContain('field1');
      expect(diff.map((d) => d.fieldId)).toContain('field3');
    });
  });

  describe('generateChangeSummary', () => {
    it('should return "変更なし" for empty changes', () => {
      const summary = generateChangeSummary([]);
      expect(summary).toBe('変更なし');
    });

    it('should return specific field name for single change', () => {
      const changes: FieldChange[] = [
        {
          fieldId: 'field1',
          fieldName: 'タイトル',
          oldValue: 'old',
          newValue: 'new',
        },
      ];

      const summary = generateChangeSummary(changes);
      expect(summary).toBe('タイトル を更新');
    });

    it('should return count for multiple changes', () => {
      const changes: FieldChange[] = [
        {
          fieldId: 'field1',
          fieldName: 'タイトル',
          oldValue: 'old',
          newValue: 'new',
        },
        {
          fieldId: 'field2',
          fieldName: '説明',
          oldValue: 'old',
          newValue: 'new',
        },
        {
          fieldId: 'field3',
          fieldName: 'タグ',
          oldValue: 'old',
          newValue: 'new',
        },
      ];

      const summary = generateChangeSummary(changes);
      expect(summary).toBe('3 個のフィールドを更新');
    });
  });

  describe('createChangeRecord', () => {
    it('should create change record with correct data', () => {
      const oldContent = { field1: 'old' };
      const newContent = { field1: 'new' };
      const reflectionId = 'ref-123';
      const userId = 'user-456';

      const change = createChangeRecord(
        reflectionId,
        userId,
        oldContent,
        newContent
      );

      expect(change.reflectionId).toBe(reflectionId);
      expect(change.changedBy).toBe(userId);
      expect(change.changes).toHaveLength(1);
      expect(change.summary).toBe('field1 を更新');
      expect(change.timestamp).toBeDefined();
    });

    it('should have ISO format timestamp', () => {
      const change = createChangeRecord(
        'ref-1',
        'user-1',
        { f: 'old' },
        { f: 'new' }
      );

      const timestamp = new Date(change.timestamp);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('hasContentChanged', () => {
    it('should return false for identical content', () => {
      const oldContent = { field1: 'value' };
      const newContent = { field1: 'value' };

      expect(hasContentChanged(oldContent, newContent)).toBe(false);
    });

    it('should return true for different content', () => {
      const oldContent = { field1: 'old' };
      const newContent = { field1: 'new' };

      expect(hasContentChanged(oldContent, newContent)).toBe(true);
    });

    it('should return true when fields are added', () => {
      const oldContent = { field1: 'value' };
      const newContent = { field1: 'value', field2: 'new' };

      expect(hasContentChanged(oldContent, newContent)).toBe(true);
    });
  });

  describe('getChangeStats', () => {
    it('should return correct stats for empty history', () => {
      const stats = getChangeStats([]);

      expect(stats.totalChanges).toBe(0);
      expect(stats.changedFields).toHaveLength(0);
      expect(stats.changeFrequency).toBe('once');
    });

    it('should return correct stats for single change', () => {
      const changes: ReflectionChange[] = [
        {
          reflectionId: 'ref-1',
          timestamp: new Date().toISOString(),
          changedBy: 'user-1',
          changes: [
            {
              fieldId: 'field1',
              fieldName: 'タイトル',
              oldValue: 'old',
              newValue: 'new',
            },
          ],
          summary: 'タイトル を更新',
        },
      ];

      const stats = getChangeStats(changes);

      expect(stats.totalChanges).toBe(1);
      expect(stats.changedFields).toContain('field1');
      expect(stats.changeFrequency).toBe('once');
    });

    it('should return "multiple" frequency for 2-5 changes', () => {
      const changes: ReflectionChange[] = Array.from({ length: 3 }).map((_, i) => ({
        reflectionId: 'ref-1',
        timestamp: new Date().toISOString(),
        changedBy: 'user-1',
        changes: [
          {
            fieldId: `field${i}`,
            fieldName: `フィールド${i}`,
            oldValue: 'old',
            newValue: 'new',
          },
        ],
        summary: `フィールド${i} を更新`,
      }));

      const stats = getChangeStats(changes);
      expect(stats.changeFrequency).toBe('multiple');
    });

    it('should return "frequent" frequency for >5 changes', () => {
      const changes: ReflectionChange[] = Array.from({ length: 10 }).map((_, i) => ({
        reflectionId: 'ref-1',
        timestamp: new Date().toISOString(),
        changedBy: 'user-1',
        changes: [
          {
            fieldId: `field${i}`,
            fieldName: `フィールド${i}`,
            oldValue: 'old',
            newValue: 'new',
          },
        ],
        summary: `フィールド${i} を更新`,
      }));

      const stats = getChangeStats(changes);
      expect(stats.changeFrequency).toBe('frequent');
    });
  });

  describe('formatChangeHistory', () => {
    it('should return "変更履歴なし" for empty history', () => {
      const formatted = formatChangeHistory([]);
      expect(formatted).toBe('変更履歴なし');
    });

    it('should format changes with dates and summaries', () => {
      const change: ReflectionChange = {
        reflectionId: 'ref-1',
        timestamp: '2024-11-15T10:30:00Z',
        changedBy: 'user-1',
        changes: [],
        summary: 'フィールドを更新',
      };

      const formatted = formatChangeHistory([change]);

      expect(formatted).toContain('2024-11-15');
      expect(formatted).toContain('フィールドを更新');
    });

    it('should handle multiple changes', () => {
      const changes: ReflectionChange[] = [
        {
          reflectionId: 'ref-1',
          timestamp: '2024-11-15T10:30:00Z',
          changedBy: 'user-1',
          changes: [],
          summary: '最初の更新',
        },
        {
          reflectionId: 'ref-1',
          timestamp: '2024-11-16T15:45:00Z',
          changedBy: 'user-1',
          changes: [],
          summary: '2番目の更新',
        },
      ];

      const formatted = formatChangeHistory(changes);
      const lines = formatted.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('2024-11-15');
      expect(lines[1]).toContain('2024-11-16');
    });
  });

  describe('Local storage tracking', () => {
    it('should track change locally', () => {
      const reflectionId = 'ref-123';
      const change: ReflectionChange = {
        reflectionId,
        timestamp: new Date().toISOString(),
        changedBy: 'user-1',
        changes: [],
        summary: 'テスト更新',
      };

      trackChangeLocally(reflectionId, change);

      const stored = localStorage.getItem(`reflection_changes_${reflectionId}`);
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].summary).toBe('テスト更新');
    });

    it('should get local change history', () => {
      const reflectionId = 'ref-123';
      const changes: ReflectionChange[] = [
        {
          reflectionId,
          timestamp: new Date().toISOString(),
          changedBy: 'user-1',
          changes: [],
          summary: 'テスト1',
        },
        {
          reflectionId,
          timestamp: new Date().toISOString(),
          changedBy: 'user-1',
          changes: [],
          summary: 'テスト2',
        },
      ];

      changes.forEach((change) => trackChangeLocally(reflectionId, change));

      const retrieved = getLocalChangeHistory(reflectionId);

      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].summary).toBe('テスト1');
      expect(retrieved[1].summary).toBe('テスト2');
    });

    it('should return empty array when no history exists', () => {
      const history = getLocalChangeHistory('nonexistent-ref');
      expect(history).toHaveLength(0);
    });

    it('should clear local change history', () => {
      const reflectionId = 'ref-123';
      const change: ReflectionChange = {
        reflectionId,
        timestamp: new Date().toISOString(),
        changedBy: 'user-1',
        changes: [],
        summary: 'テスト',
      };

      trackChangeLocally(reflectionId, change);
      expect(getLocalChangeHistory(reflectionId)).toHaveLength(1);

      clearLocalChangeHistory(reflectionId);
      expect(getLocalChangeHistory(reflectionId)).toHaveLength(0);
    });

    it('should keep only last 50 changes per reflection', () => {
      const reflectionId = 'ref-123';

      // Add 60 changes
      for (let i = 0; i < 60; i++) {
        const change: ReflectionChange = {
          reflectionId,
          timestamp: new Date().toISOString(),
          changedBy: 'user-1',
          changes: [],
          summary: `変更${i}`,
        };
        trackChangeLocally(reflectionId, change);
      }

      const history = getLocalChangeHistory(reflectionId);
      expect(history).toHaveLength(50);
      expect(history[0].summary).toBe('変更10'); // First 10 removed
      expect(history[49].summary).toBe('変更59'); // Last one kept
    });
  });
});
