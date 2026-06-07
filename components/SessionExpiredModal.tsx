'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Listens for the global `auth:session-expired` event fired by lib/api.ts when
// an authenticated request returns 401. Shows a blocking modal that funnels the
// user back to /auth/login.
export default function SessionExpiredModal() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onExpired = () => {
      // Don't pop the modal on auth pages — the user is already heading there.
      if (pathname?.startsWith('/auth/')) return;
      setOpen(true);
    };
    window.addEventListener('auth:session-expired', onExpired);
    return () => window.removeEventListener('auth:session-expired', onExpired);
  }, [pathname]);

  if (!open) return null;

  const handleGoToLogin = () => {
    setOpen(false);
    router.push('/auth/login');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h3a.75.75 0 000-1.5h-2.25V5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Session expired</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              For your security, you've been signed out. Please log in again to continue.
            </p>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={handleGoToLogin}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}
