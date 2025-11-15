'use client';

import React from 'react';
import { Calendar, Tag, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';
import { FieldDisplay } from './FieldDisplay';

interface ReflectionDetailProps {
  reflection: Reflection;
  framework: Framework | undefined;
  onEdit: () => void;
  onDelete: () => void;
  isLoading?: boolean;
}

/**
 * ReflectionDetail - Detailed view component for a single reflection
 *
 * Features:
 * - Displays reflection metadata (date, time, framework)
 * - Shows all fields with values in read-only format
 * - Displays tags if present
 * - Shows creation and update timestamps
 * - Edit and back navigation buttons
 */
export const ReflectionDetail: React.FC<ReflectionDetailProps> = ({
  reflection,
  framework,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  // Helper function to safely parse dates
  const safeParse = (dateStr: string | undefined): Date => {
    if (!dateStr) {
      return new Date();
    }

    try {
      const date = parseISO(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch {
      // Ignore parsing error and try fallback
    }

    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch {
      // Ignore parsing error
    }

    // Last resort: try to extract date from string (YYYY-MM-DD)
    const match = dateStr?.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return new Date();
  };

  // Parse timestamps with fallback handling
  const reflectionDate = safeParse(reflection.reflection_date);
  // Note: created_at and updated_at are already converted to user timezone in reflectionService
  // so we just need to format them as strings
  const dateStr = format(reflectionDate, 'yyyy年MM月dd日（EEEE）', {
    locale: ja,
  });
  const createdStr = reflection.created_at.replace('T', ' ');
  const updatedStr = reflection.updated_at ? reflection.updated_at.replace('T', ' ') : null;

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header with navigation */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-end mb-4 gap-2">
          <button
            onClick={onDelete}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
            title="この振り返りを削除"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-medium">削除</span>
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            <Edit2 className="w-4 h-4" />
            <span className="text-sm font-medium">編集</span>
          </button>
        </div>

        {/* Metadata section */}
        <div className="space-y-3">
          {/* Framework info */}
          {framework && (
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: framework.color || '#6B7280' }}
              />
              <span className="text-sm font-medium text-gray-700">
                {framework.icon} {framework.display_name}
              </span>
            </div>
          )}

          {/* Date */}
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{dateStr}</span>
          </div>

          {/* Tags if present */}
          {reflection.tags && reflection.tags.length > 0 && (
            <div className="flex items-start gap-2 pt-2">
              <Tag className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
              <div className="flex flex-wrap gap-2">
                {reflection.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Mood if present */}
          {reflection.mood && (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-sm">
                <span className="font-medium">気分:</span> {reflection.mood}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content section with fields */}
      <div className="p-6 space-y-6">
        {/* Framework fields */}
        {framework?.schema && framework.schema.length > 0 ? (
          <div className="space-y-6">
            {framework.schema.map((field, idx) => (
              <FieldDisplay
                key={field.id || `field-${idx}`}
                field={field}
                value={reflection.content[field.id] || ''}
                fieldIndex={idx}
                icon={field.icon}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">フレームワーク情報が見つかりません</p>
          </div>
        )}
      </div>

      {/* Timestamp info footer */}
      <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-lg">
        <div className="space-y-2 text-xs text-gray-600">
          <div>
            <span className="font-medium">作成日時:</span> {createdStr}
          </div>
          {updatedStr && updatedStr !== createdStr && (
            <div>
              <span className="font-medium">更新日時:</span> {updatedStr}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
