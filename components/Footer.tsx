import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo */}
          <div className="flex-shrink-0">
            <img
              src="/wfc-logo.svg"
              alt="WFC Biennial Congress 2029 Logo"
              className="h-16 w-auto"
            />
          </div>

          {/* Social Media Icons */}
          <div className="flex gap-3">
            <a
              href="https://www.wfc.org"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-primary-500 hover:bg-primary-600 text-white rounded flex items-center justify-center transition-colors"
              aria-label="World Federation of Chiropractic Website"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </a>
            
          </div>

          {/* Address */}
          <div className="text-right text-sm text-gray-600">
            <p className="font-medium">WFC Biennial Congress 2029 Secretariat</p>
            <p>
              Rwanda Chiropractic Association
              <br />
              Kigali Convention Centre, KG 2 Roundabout
            </p>
            <p>Kigali, Rwanda</p>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
          <div className="flex gap-6">
            <Link
              href="https://smartevent.rw/privacy-policy"
              target="_blank"
              className="hover:text-primary-500 transition-colors"
            >
              PRIVACY POLICY
            </Link>
            <Link
              href="https://smartevent.rw/terms-of-use"
              target="_blank"
              className="hover:text-primary-500 transition-colors"
            >
              TERMS OF USE
            </Link>
          </div>
          <div>© 2029 WFC Biennial Congress. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
