'use client';

import { useState, useEffect } from 'react';
import { abstractsApi } from '@/lib/api';
import type { Changelog, AbstractHistory } from '@/lib/types';

interface ChangelogModalProps {
  abstractId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangelogModal({ abstractId, isOpen, onClose }: ChangelogModalProps) {
  const [changelog, setChangelog] = useState<Changelog | null>(null);
  const [history, setHistory] = useState<AbstractHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'changelog' | 'history'>('changelog');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [abstractId, isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const [changelogResponse, historyResponse] = await Promise.all([
        abstractsApi.getChangelog(abstractId),
        abstractsApi.getHistory(abstractId),
      ]);

      if (changelogResponse.data) {
        setChangelog(changelogResponse.data);
      }

      if (historyResponse.data) {
        setHistory(historyResponse.data);
      }

      if (!changelogResponse.data && !historyResponse.data) {
        setError('Unable to load data');
      }
    } catch (err) {
      setError('Failed to load data');
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
    let text = html.replace(/<[^>]*>/g, '');
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  };

  const formatValue = (value: any, truncate: boolean = true): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);

    const stringValue = String(value);

    if (/<[^>]*>/.test(stringValue)) {
      const cleanText = stripHtmlTags(stringValue);
      if (truncate) {
        return cleanText.length > 200
          ? cleanText.substring(0, 200) + '...'
          : cleanText;
      }
      return cleanText;
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">History & Changelog</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('changelog')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'changelog'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Changelog
            {changelog && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                {changelog.changes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Raw History
            {history.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                {history.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-gray-500 py-8">
              Loading...
            </div>
          ) : error ? (
            <div className="text-center text-gray-500 py-8">
              {error}
            </div>
          ) : activeTab === 'changelog' ? (
            /* Changelog Tab */
            <div>
              {/* Current Version Summary */}
              {changelog?.currentVersion && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-primary-700 mb-2">
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
                        {new Date(changelog.currentVersion.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Changelog Entries */}
              <div className="space-y-6">
                {!changelog || changelog.changes.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No changes recorded yet
                  </div>
                ) : (
                  changelog.changes.map((change, index) => {
                    const changeTypeInfo = getChangeTypeLabel(change.changeType);
                    return (
                      <div
                        key={index}
                        className="border-l-4 border-primary-500 pl-4 py-2"
                      >
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

                        {change.fieldChanges.length > 0 && (
                          <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono">
                            {change.fieldChanges.map((fieldChange, fieldIndex) => (
                              <div key={fieldIndex} className="mb-3 last:mb-0">
                                <span className="text-gray-500">{getFieldLabel(fieldChange.field)}: </span>
                                {fieldChange.oldValue !== null && (
                                  <span className="bg-red-100 text-red-700 line-through px-1 rounded">
                                    {formatValue(fieldChange.oldValue)}
                                  </span>
                                )}
                                {fieldChange.oldValue !== null && ' → '}
                                <span className="bg-green-100 text-green-700 px-1 rounded font-medium">
                                  {formatValue(fieldChange.newValue)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* History Tab (Parsed Audit Log) */
            <div>
              <div className="space-y-6">
                {history.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No history records found
                  </div>
                ) : (
                  history.map((entry) => {
                    const changeTypeInfo = getChangeTypeLabel(entry.changeType);
                    const changedFields = entry.newValues ? Object.keys(entry.newValues) : [];

                    return (
                      <div
                        key={entry.id}
                        className="border-l-4 border-gray-400 pl-4 py-2"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${changeTypeInfo.color}`}
                              >
                                {changeTypeInfo.label}
                              </span>
                              <span className="text-sm font-medium text-gray-700">
                                by {entry.changedBy}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {new Date(entry.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400">
                            #{entry.id}
                          </span>
                        </div>

                        {/* Field Changes */}
                        {changedFields.length > 0 ? (
                          <div className="space-y-3">
                            {changedFields.map((field) => {
                              const oldValue = entry.previousValues?.[field];
                              const newValue = entry.newValues?.[field];

                              return (
                                <div
                                  key={field}
                                  className="bg-gray-50 rounded-lg p-3 text-sm"
                                >
                                  <div className="font-semibold text-gray-800 mb-2">
                                    {getFieldLabel(field)}
                                  </div>

                                  {/* Old value */}
                                  {oldValue !== undefined && oldValue !== null && (
                                    <div className="mb-2">
                                      <span className="text-xs text-gray-600 uppercase font-medium">
                                        Old:
                                      </span>
                                      <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-gray-700 line-through">
                                        {formatValue(oldValue)}
                                      </div>
                                    </div>
                                  )}

                                  {/* New value */}
                                  <div>
                                    <span className="text-xs text-gray-600 uppercase font-medium">
                                      {oldValue !== undefined && oldValue !== null ? 'New:' : 'Value:'}
                                    </span>
                                    <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-gray-900 font-medium">
                                      {formatValue(newValue)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic">
                            No field changes recorded
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
