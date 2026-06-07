'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api';
import type { User } from '@/lib/types';
import { mockParticipants } from '@/lib/mockData';
import AppLayout from '@/components/AppLayout';

export default function ParticipantsPage() {
  const router = useRouter();
  const [participants, setParticipants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Check authentication
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/auth/login?role=reviewer');
      return;
    }

    const userData = JSON.parse(user);
    if (!userData.isStaff && !userData.isSuperAdmin) {
      router.push('/');
      return;
    }

    fetchParticipants();
  }, [router]);

  const fetchParticipants = async () => {
    setLoading(true);
    const response = await usersApi.getAll();

    if (response.data && Array.isArray(response.data)) {
      // Filter to only show non-staff users (participants)
      const participantsList = response.data.filter(
        (user: User) => !user.isStaff,
      );
      setParticipants(participantsList);
    } else {
      // Use mock data if API fails (Demo mode)
      console.log('API failed, using mock data for demo');
      setParticipants(mockParticipants);
      setError('');
    }
    setLoading(false);
  };

  const filteredParticipants = participants.filter((participant) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      participant.firstName.toLowerCase().includes(searchLower) ||
      participant.lastName.toLowerCase().includes(searchLower) ||
      participant.email.toLowerCase().includes(searchLower) ||
      (participant.companyName?.toLowerCase().includes(searchLower) ?? false) ||
      (participant.country?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-100 rounded-lg">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Participants List</h1>
                <p className="text-gray-500 text-sm">View all registered participants</p>
              </div>
            </div>
            <div className="text-sm text-gray-600 bg-primary-50 px-4 py-2 rounded-lg">
              Total Participants:{' '}
              <span className="font-semibold text-primary-600">
                {participants.length}
              </span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email, organization, or country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Participants Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading participants...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-accent-red">{error}</div>
          ) : filteredParticipants.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm
                ? 'No participants found matching your search'
                : 'No participants found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary-500 text-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Country
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Registered
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredParticipants.map((participant) => (
                    <tr key={participant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {participant.profilePicture ? (
                            <img
                              src={participant.profilePicture}
                              alt={`${participant.firstName} ${participant.lastName}`}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-primary-600 font-semibold text-sm">
                                {participant.firstName.charAt(0)}
                                {participant.lastName.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div className="text-sm font-medium text-gray-900">
                            {participant.firstName} {participant.lastName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={`mailto:${participant.email}`}
                          className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          {participant.email}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {participant.phoneNumber || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {participant.companyName || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {participant.country || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(participant.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {!loading && filteredParticipants.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Participants</div>
                  <div className="text-2xl font-bold text-gray-900">{participants.length}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Countries Represented</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {new Set(participants.map((p) => p.country).filter(Boolean)).size}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Organizations</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {new Set(participants.map((p) => p.companyName).filter(Boolean)).size}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
