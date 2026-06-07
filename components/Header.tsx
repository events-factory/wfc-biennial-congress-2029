'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/lib/types';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const userStr =
      typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        setUser(null);
      }
    }
  }, [pathname]); // Re-check when pathname changes

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setMenuOpen(false);
    router.push('/');
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="inline-block">
            <img
              src="/wfc-logo.svg"
              alt="WFC Biennial Congress 2029 — Kigali, Rwanda"
              className="h-16 w-auto"
            />
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            {/* External Link */}
            <a
              href="https://www.wfc.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-block px-4 py-2 text-primary-500 hover:text-primary-600 transition-colors font-medium"
            >
              Guidelines
            </a>

            {user ? (
              <>
                {/* Logged in navigation */}
                <nav className="hidden md:flex items-center gap-2">
                  {user.isSuperAdmin || user.isStaff ? (
                    <>
                      <Link
                        href="/dashboard"
                        className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                          isActive('/dashboard')
                            ? 'bg-primary-500 text-white'
                            : 'text-gray-700 hover:bg-primary-50'
                        }`}
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/participants"
                        className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                          isActive('/participants')
                            ? 'bg-primary-500 text-white'
                            : 'text-gray-700 hover:bg-primary-50'
                        }`}
                      >
                        Participants
                      </Link>
                      <Link
                        href="/invite-staff"
                        className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                          isActive('/invite-staff')
                            ? 'bg-primary-500 text-white'
                            : 'text-gray-700 hover:bg-primary-50'
                        }`}
                      >
                        Invite Reviewer
                      </Link>
                      <Link
                        href="/invite-delegates"
                        className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                          isActive('/invite-delegates')
                            ? 'bg-primary-500 text-white'
                            : 'text-gray-700 hover:bg-primary-50'
                        }`}
                      >
                        Invite Delegate
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/submit"
                        className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                          isActive('/submit')
                            ? 'bg-primary-500 text-white'
                            : 'text-gray-700 hover:bg-primary-50'
                        }`}
                      >
                        Submit
                      </Link>
                      <Link
                        href="/my-submissions"
                        className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                          isActive('/my-submissions')
                            ? 'bg-primary-500 text-white'
                            : 'text-gray-700 hover:bg-primary-50'
                        }`}
                      >
                        My Submissions
                      </Link>
                    </>
                  )}
                  <Link
                    href="/profile"
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      isActive('/profile')
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-700 hover:bg-primary-50'
                    }`}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Logout
                  </button>
                </nav>

                {/* Mobile menu button */}
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Toggle menu"
                >
                  <svg
                    className="w-6 h-6 text-gray-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {menuOpen ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    )}
                  </svg>
                </button>
              </>
            ) : (
              <>
                {/* Not logged in */}
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-primary-500 hover:text-primary-600 transition-colors font-medium"
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && user && (
          <nav className="md:hidden mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-col gap-2">
              <a
                href="https://www.wfc.org"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-gray-700 hover:bg-primary-50 rounded-lg transition-colors font-medium"
              >
                Guidelines
              </a>
              {user.isSuperAdmin || user.isStaff ? (
                <>
                  <Link
                    href="/dashboard"
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      isActive('/dashboard')
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-700 hover:bg-primary-50'
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/participants"
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      isActive('/participants')
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-700 hover:bg-primary-50'
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    Participants
                  </Link>
                  <Link
                    href="/invite-staff"
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      isActive('/invite-staff')
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-700 hover:bg-primary-50'
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    Invite Reviewer
                  </Link>
                  <Link
                    href="/invite-delegates"
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      isActive('/invite-delegates')
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-700 hover:bg-primary-50'
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    Invite Delegate
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/submit"
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      isActive('/submit')
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-700 hover:bg-primary-50'
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    Submit
                  </Link>
                  <Link
                    href="/my-submissions"
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      isActive('/my-submissions')
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-700 hover:bg-primary-50'
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    My Submissions
                  </Link>
                </>
              )}
              <Link
                href="/profile"
                className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                  isActive('/profile')
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-700 hover:bg-primary-50'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-left"
              >
                Logout
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
