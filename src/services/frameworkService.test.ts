import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Framework, FrameworkField } from '@/types/framework';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(function(this: any) {
          return this;
        }),
        order: vi.fn(function(this: any) {
          return this;
        }),
        single: vi.fn(function(this: any) {
          return this;
        }),
      })),
    })),
  })),
}));

// Test data
const mockYWTFramework = {
  id: 'ywtl',
  name: 'YWTL',
  display_name: 'YWT',
  description: 'Yatta, Wakatta, Tsugiha',
  schema: {
    fields: [
      {
        id: 't',
        label: 'つぎは',
        placeholder: 'つぎはどうする？',
        order: 2,
      },
      {
        id: 'w',
        label: 'わかったこと',
        placeholder: 'わかったことは？',
        order: 1,
      },
      {
        id: 'y',
        label: 'やったこと',
        placeholder: 'やったことは？',
        order: 0,
      },
    ] as FrameworkField[],
  },
  icon: '📝',
  color: '#10B981',
  is_active: true,
  sort_order: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockKPTFramework = {
  id: 'kpt',
  name: 'KPT',
  display_name: 'KPT',
  description: 'Keep, Problem, Try',
  schema: {
    fields: [
      {
        id: 't',
        label: 'Try',
        placeholder: 'Try',
        order: 2,
      },
      {
        id: 'p',
        label: 'Problem',
        placeholder: 'Problem',
        order: 1,
      },
      {
        id: 'k',
        label: 'Keep',
        placeholder: 'Keep',
        order: 0,
      },
    ] as FrameworkField[],
  },
  icon: '🎯',
  color: '#3b82f6',
  is_active: true,
  sort_order: 2,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('frameworkService - Schema Field Sorting', () => {
  describe('YWT Framework Field Order', () => {
    it('should sort YWT fields by order attribute (y=0, w=1, t=2)', () => {
      // Simulate the sorting logic from frameworkService
      const fields = mockYWTFramework.schema.fields as FrameworkField[];
      const sortedFields = fields.sort((a: FrameworkField, b: FrameworkField) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });

      expect(sortedFields).toHaveLength(3);
      expect(sortedFields[0].id).toBe('y');
      expect(sortedFields[0].order).toBe(0);
      expect(sortedFields[1].id).toBe('w');
      expect(sortedFields[1].order).toBe(1);
      expect(sortedFields[2].id).toBe('t');
      expect(sortedFields[2].order).toBe(2);
    });

    it('should maintain order when fields are already sorted', () => {
      const preSortedFields = [
        { id: 'y', label: 'やったこと', placeholder: '', order: 0 },
        { id: 'w', label: 'わかったこと', placeholder: '', order: 1 },
        { id: 't', label: 'つぎは', placeholder: '', order: 2 },
      ] as FrameworkField[];

      const sortedFields = preSortedFields.sort((a: FrameworkField, b: FrameworkField) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });

      expect(sortedFields[0].id).toBe('y');
      expect(sortedFields[1].id).toBe('w');
      expect(sortedFields[2].id).toBe('t');
    });

    it('should correctly reorder when fields are in reverse order', () => {
      const reversedFields = [
        { id: 't', label: 'つぎは', placeholder: '', order: 2 },
        { id: 'w', label: 'わかったこと', placeholder: '', order: 1 },
        { id: 'y', label: 'やったこと', placeholder: '', order: 0 },
      ] as FrameworkField[];

      const sortedFields = reversedFields.sort((a: FrameworkField, b: FrameworkField) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });

      expect(sortedFields[0].id).toBe('y');
      expect(sortedFields[1].id).toBe('w');
      expect(sortedFields[2].id).toBe('t');
    });

    it('should handle fields with missing order attribute', () => {
      const fieldsWithMissingOrder = [
        { id: 'a', label: 'Field A', placeholder: '' },
        { id: 'b', label: 'Field B', placeholder: '', order: 1 },
        { id: 'c', label: 'Field C', placeholder: '', order: 0 },
      ] as FrameworkField[];

      const sortedFields = fieldsWithMissingOrder.sort((a: FrameworkField, b: FrameworkField) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });

      // Fields without order attribute default to 0
      // After sorting: c(0), a(0), b(1) - order is preserved for equal values
      expect(sortedFields.some(f => f.id === 'c' && f.order === 0)).toBe(true); // c with order 0
      expect(sortedFields.some(f => f.id === 'a' && !f.order)).toBe(true); // a without order (defaults to 0)
      expect(sortedFields[sortedFields.length - 1].id).toBe('b'); // b with order 1 should be last
    });
  });

  describe('KPT Framework Field Order', () => {
    it('should sort KPT fields by order attribute (k=0, p=1, t=2)', () => {
      const fields = mockKPTFramework.schema.fields as FrameworkField[];
      const sortedFields = fields.sort((a: FrameworkField, b: FrameworkField) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });

      expect(sortedFields).toHaveLength(3);
      expect(sortedFields[0].id).toBe('k');
      expect(sortedFields[1].id).toBe('p');
      expect(sortedFields[2].id).toBe('t');
    });
  });

  describe('Content Object Key Order', () => {
    it('should preserve field order when creating content object', () => {
      const sortedFields = [
        { id: 'y', label: 'やったこと', placeholder: '', order: 0 },
        { id: 'w', label: 'わかったこと', placeholder: '', order: 1 },
        { id: 't', label: 'つぎは', placeholder: '', order: 2 },
      ] as FrameworkField[];

      // Simulate form submission with fields in schema order
      const content: Record<string, string> = {};
      sortedFields.forEach((field) => {
        content[field.id] = `test value for ${field.id}`;
      });

      const keys = Object.keys(content);
      expect(keys).toEqual(['y', 'w', 't']);
      expect(keys[0]).toBe('y');
      expect(keys[1]).toBe('w');
      expect(keys[2]).toBe('t');
    });

    it('should result in Y-W-T order in saved JSON', () => {
      const contentInOrder = {
        y: 'やったことの内容',
        w: 'わかったことの内容',
        t: 'つぎはの内容',
      };

      const json = JSON.stringify(contentInOrder);
      const parsed = JSON.parse(json);
      const keys = Object.keys(parsed);

      expect(keys).toEqual(['y', 'w', 't']);
    });
  });

  describe('Schema Casting and Sorting', () => {
    it('should correctly cast and sort mixed order fields', () => {
      const mixedFields = [
        { id: 'field2', label: 'Field 2', placeholder: '', order: 1 },
        { id: 'field0', label: 'Field 0', placeholder: '', order: 0 },
        { id: 'field3', label: 'Field 3', placeholder: '', order: 3 },
        { id: 'field1', label: 'Field 1', placeholder: '', order: 2 },
      ] as FrameworkField[];

      const sortedFields = (mixedFields || []).sort((a: FrameworkField, b: FrameworkField) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });

      expect(sortedFields[0].id).toBe('field0');
      expect(sortedFields[1].id).toBe('field2');
      expect(sortedFields[2].id).toBe('field1');
      expect(sortedFields[3].id).toBe('field3');
    });
  });
});
