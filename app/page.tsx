'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import type { User } from '@/lib/types';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [welcomeToast, setWelcomeToast] = useState<User | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr) as User;
        setUser(parsed);
        // Show the welcome toast at most once per browser session, only when an
        // existing session is detected on the landing page.
        if (sessionStorage.getItem('welcome-toast-shown') !== '1') {
          sessionStorage.setItem('welcome-toast-shown', '1');
          setWelcomeToast(parsed);
        }
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!welcomeToast) return;
    const t = setTimeout(() => setWelcomeToast(null), 6000);
    return () => clearTimeout(t);
  }, [welcomeToast]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 to-primary-100">
      {welcomeToast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-3 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold shrink-0">
              {(welcomeToast.firstName?.charAt(0) ?? '') + (welcomeToast.lastName?.charAt(0) ?? '') || '·'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                Welcome back, {welcomeToast.firstName} {welcomeToast.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                Signed in as {welcomeToast.email}
              </p>
            </div>
            <button
              onClick={() => setWelcomeToast(null)}
              aria-label="Dismiss"
              className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
      <Header />
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <p className="text-base font-semibold text-teal mb-2 tracking-wide">
            Sit Less, Live More
          </p>
          <h1 className="text-5xl font-bold text-primary-700 mb-4">
            WFC Biennial Congress 2029
          </h1>
          <p className="text-xl text-primary-600">
            Registration &amp; abstract management portal — Kigali, Rwanda
          </p>
        </div>

        <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
          {/* Conference Registration Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                 Registration <br /> (Payment in USD)
              </h2>
              <p className="text-gray-600 mb-6">
                Register to attend the WFC Biennial Congress 2029
              </p>
            </div>
            <div className="space-y-3">
              <Link
                href="/register-conference"
                className="block w-full bg-green-500 text-white text-center py-3 rounded-lg hover:bg-green-600 transition-colors font-semibold"
              >
                Register for the Congress
              </Link>
              <p className="text-sm text-gray-500 text-center">
                2029 | Kigali Convention Centre, Rwanda
              </p>
            </div>
          </div>

          {/* Login / Dashboard Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              {user ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Welcome back, {user.firstName}!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    {user.isSuperAdmin
                      ? 'Manage the conference platform'
                      : user.isStaff
                      ? 'Manage abstracts and participants'
                      : 'Continue managing your abstracts and submissions'}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome</h2>
                  <p className="text-gray-600 mb-6">
                    Sign in to access the abstract management system
                  </p>
                </>
              )}
            </div>
            <div className="space-y-3">
              {user ? (
                <>
                  <Link
                    href={user.isSuperAdmin || user.isStaff ? '/dashboard' : '/my-submissions'}
                    className="block w-full bg-primary-500 text-white text-center py-3 rounded-lg hover:bg-primary-600 transition-colors font-semibold"
                  >
                    {user.isSuperAdmin || user.isStaff ? 'Go to Dashboard' : 'My Submissions'}
                  </Link>
                  {!user.isSuperAdmin && !user.isStaff && (
                    <Link
                      href="/submit"
                      className="block w-full border-2 border-primary-500 text-primary-500 text-center py-3 rounded-lg hover:bg-primary-50 transition-colors font-semibold"
                    >
                      Submit Abstract
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="block w-full bg-primary-500 text-white text-center py-3 rounded-lg hover:bg-primary-600 transition-colors font-semibold"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Registration and Payment Notice */}
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-3xl font-bold text-primary-700 mb-6">
            Registration and Payment Notice
          </h2>
          <p className="text-gray-700 mb-8">
            All registration fees are listed in USD. Early Bird rates apply to registrations completed before the published deadline.
          </p>

          {/* Card Payment */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-primary-600 mb-3">Card Payment</h3>
            <p className="text-gray-700">
              This platform accepts debit or credit card payments. Once payment is confirmed, your registration will be automatically approved and a receipt will be sent to your email address.
            </p>
          </div>

          {/* Additional Notes */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-primary-600 mb-3">Additional Notes</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Group rates apply to groups of 8 or more delegates.</li>
              <li>Registration includes access to congress sessions and materials. Optional activities may require separate registration.</li>
              <li>Delegates using RwandAir may be eligible for a discount on air tickets — see the official congress announcements.</li>
              <li>Invoices are available on request after payment is completed.</li>
            </ul>
          </div>

          <p className="text-gray-700">
            For support or payment questions, contact:{' '}
            <a
              href="mailto:info@wfc2029.rw"
              className="text-primary-600 underline hover:text-primary-700"
            >
              info@wfc2029.rw
            </a>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
