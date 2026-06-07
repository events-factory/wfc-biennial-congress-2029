'use client';

import { useState, useEffect } from 'react';
import { abstractsApi } from '@/lib/api';
import type { Changelog, ChangelogEntry } from '@/lib/types';

interface ChangelogViewerProps {
  abstractId: number;
}

export default function ChangelogViewer({ abstractId }: ChangelogViewerProps) {
  const [changelog, setChangelog] = useState<Changelog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'changelog' | 'current'>('current');

  useEffect(() => {
    fetchChangelog();
  }, [abstractId]);

  const fetchChangelog = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await abstractsApi.getChangelog(abstractId);

      if (response.data) {
        setChangelog(response.data);
      } else {
        setError('Unable to load changelog');
      }
    } catch (err) {
      setError('Failed to load changelog');
    } finally {
      setLoading(false);
    }
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      title: 'Title',
      subThemeCategory: 'Sub-Theme Category',
      presentationType: 'Presentation Type',
      authorInformation: 'Author Information',
      presenterFullName: 'Presenter Name',
      presenterEmail: 'Presenter Email',
      presenterPhone: 'Presenter Phone',
      presenterInstitution: 'Presenter Institution',
      presenterCountry: 'Presenter Country',
      deanContact: 'Dean Contact',
      abstractBody: 'Abstract Body',
      status: 'Status',
      reviewNote: 'Review Note',
    };
    return labels[field] || field;
  };

  const stripHtmlTags = (html: string): string => {
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, '');
    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    // Clean up multiple spaces
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);

    const stringValue = String(value);

    // Check if value contains HTML tags
    if (/<[^>]*>/.test(stringValue)) {
      const cleanText = stripHtmlTags(stringValue);
      // Truncate long text
      return cleanText.length > 200
        ? cleanText.substring(0, 200) + '...'
        : cleanText;
    }

    return stringValue;
  };

  const getChangeTypeLabel = (
    changeType: string,
  ): { label: string; color: string } => {
    const types: Record<string, { label: string; color: string }> = {
      created: { label: 'Created', color: 'bg-blue-100 text-blue-800' },
      updated: { label: 'Updated', color: 'bg-yellow-100 text-yellow-800' },
      status_changed: {
        label: 'Status Changed',
        color: 'bg-purple-100 text-purple-800',
      },
    };
    return (
      types[changeType] || {
        label: changeType,
        color: 'bg-gray-100 text-gray-800',
      }
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">Loading changelog...</div>
      </div>
    );
  }

  if (error || !changelog) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          {error || 'No changelog available'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header with toggle */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Change History</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('current')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'current'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Current Version
          </button>
          <button
            onClick={() => setViewMode('changelog')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'changelog'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Full History ({changelog.changes.length})
          </button>
        </div>
      </div>

      {viewMode === 'current' ? (
        /* Current Version View */
        <div className="space-y-4">
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-primary-700 mb-2">
              Current Version
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Status:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {changelog.currentVersion.status}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Last Updated:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {new Date(
                    changelog.currentVersion.updatedAt,
                  ).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <p>
              This abstract has been modified {changelog.changes.length}{' '}
              time(s). Switch to &quot;Full History&quot; to see all changes.
            </p>
          </div>
        </div>
      ) : (
        /* Full Changelog View */
        <div className="space-y-6">
          {changelog.changes.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No changes recorded yet
            </div>
          ) : (
            changelog.changes.map((change, index) => {
              const changeTypeInfo = getChangeTypeLabel(change.changeType);
              return (
                <div
                  key={index}
                  className="border-l-4 border-primary-500 pl-4 py-2 relative"
                >
                  {/* Change header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${changeTypeInfo.color}`}
                        >
                          {changeTypeInfo.label}
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          by {change.changedBy}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(change.changedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Field changes */}
                  {change.fieldChanges.length > 0 && (
                    <div className="space-y-3">
                      {change.fieldChanges.map((fieldChange, fieldIndex) => (
                        <div
                          key={fieldIndex}
                          className="bg-gray-50 rounded-lg p-3 text-sm"
                        >
                          <div className="font-semibold text-gray-800 mb-2">
                            {getFieldLabel(fieldChange.field)}
                          </div>

                          {/* Old value */}
                          {fieldChange.oldValue !== null && (
                            <div className="mb-2">
                              <span className="text-xs text-gray-600 uppercase font-medium">
                                Old:
                              </span>
                              <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-gray-700 line-through">
                                {formatValue(fieldChange.oldValue)}
                              </div>
                            </div>
                          )}

                          {/* New value */}
                          <div>
                            <span className="text-xs text-gray-600 uppercase font-medium">
                              New:
                            </span>
                            <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-gray-900 font-medium">
                              {formatValue(fieldChange.newValue)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
