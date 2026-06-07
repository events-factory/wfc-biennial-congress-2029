'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.forgotPassword(email);
      // The API always returns the same message whether the email exists or not.
      // A real server/route error will have a message that doesn't match the expected response.
      const msg = response.message ?? '';
      const isServerError =
        msg.includes('Cannot POST') ||
        msg.includes('Proxy error') ||
        msg.includes('Not Found') ||
        msg.includes('Network error');
      if (isServerError) {
        setError('Service unavailable. Please try again later.');
      } else {
        setSubmitted(true);
      }
    } catch {
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
              <h1 className="text-3xl font-bold text-primary-700 mb-2">Forgot Password</h1>
              <p className="text-gray-600">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {submitted ? (
              <div className="text-center space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
                  If an account exists for that email, a password reset link has been sent.
                  Please check your inbox.
                </div>
                <Link
                  href="/auth/login"
                  className="block w-full py-3 rounded-lg font-semibold text-white text-center bg-primary-500 hover:bg-primary-600 transition-colors"
                >
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <>
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-lg font-semibold text-white transition-colors bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    href="/auth/login"
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← Back to Sign In
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
