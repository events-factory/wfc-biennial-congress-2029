import type { Metadata } from 'next'
import './globals.css'
import SessionExpiredModal from '@/components/SessionExpiredModal'

export const metadata: Metadata = {
  title: 'WFC Biennial Congress 2029 — Abstract & Registration Portal',
  description:
    'Sit Less, Live More — submit abstracts and register for the WFC Biennial Congress 2029 in Kigali, Rwanda',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <SessionExpiredModal />
      </body>
    </html>
  )
}
