import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-accent-green rounded-full flex items-center justify-center mx-auto mb-6">
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
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Submission Successful!
          </h1>

          <p className="text-gray-600 mb-8">
            Your abstract has been submitted successfully. You will receive a confirmation email
            shortly. Our review team will evaluate your submission and get back to you soon.
          </p>

          <div className="space-y-3">
            <Link
              href="/my-submissions"
              className="block w-full bg-primary-500 text-white text-center py-3 rounded-lg hover:bg-primary-600 transition-colors font-semibold"
            >
              View My Submissions
            </Link>
            <Link
              href="/submit"
              className="block w-full border-2 border-primary-500 text-primary-500 text-center py-3 rounded-lg hover:bg-primary-50 transition-colors font-semibold"
            >
              Submit Another Abstract
            </Link>
            <Link
              href="/"
              className="block w-full text-gray-600 text-center py-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
