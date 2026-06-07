'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi, clearSession } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function LoginForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = () => {
    // Create mock user data for demo purposes (Staff/Reviewer)
    const mockUser = {
      id: Date.now(),
      email: formData.email || 'reviewer@example.com',
      firstName: 'Demo',
      lastName: 'Reviewer',
      isActive: true,
      isStaff: true,
      isSuperAdmin: false, // Set to true for super admin demo
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockToken = 'demo-token-' + Math.random().toString(36).substring(7);

    clearSession();
    localStorage.setItem('authToken', mockToken);
    localStorage.setItem('user', JSON.stringify(mockUser));
    window.dispatchEvent(new CustomEvent('auth:session-resumed'));

    router.push('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(
        formData.email,
        formData.password
      );

      if (response.data) {
        // Wipe any prior user's session before installing the new one.
        clearSession();
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        // Tell the API layer we have a fresh session so the next 401 can fire again.
        window.dispatchEvent(new CustomEvent('auth:session-resumed'));

        // Redirect based on role from backend
        if (response.data.user.isStaff || response.data.user.isSuperAdmin) {
          router.push('/dashboard');
        } else {
          router.push('/submit');
        }
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 to-primary-100">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary-700 mb-2">Sign In</h1>
            <p className="text-gray-600">
              Access your abstract management account
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-accent-red/10 border border-accent-red text-accent-red rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary-500 hover:text-primary-600"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                id="password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-white transition-colors bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Mode Button */}
          {/* <div className="mt-4">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-3 rounded-lg font-semibold text-primary-500 border-2 border-primary-500 hover:bg-primary-50 transition-colors"
            >
              Demo Mode (No Backend Required)
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Click here to test the app without API
            </p>
          </div> */}

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link
                href="/auth/register"
                className="text-primary-500 hover:text-primary-600 font-semibold"
              >
                Create Account
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
