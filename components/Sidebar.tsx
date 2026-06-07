'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import type { User } from '@/lib/types'

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (userStr) {
      try {
        setUser(JSON.parse(userStr))
      } catch (e) {
        setUser(null)
      }
    }
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    setUser(null)
    setMobileOpen(false)
    router.push('/')
  }

  const isActive = (path: string) => pathname === path

  const NavLink = ({
    href,
    icon,
    label,
    external,
  }: {
    href: string
    icon: React.ReactNode
    label: string
    external?: boolean
  }) => {
    const active = isActive(href)
    const baseClasses = `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
      active
        ? 'bg-primary-500 text-white shadow-md'
        : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'
    }`

    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={baseClasses}
          onClick={() => setMobileOpen(false)}
        >
          <span className={`flex-shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-primary-500'}`}>
            {icon}
          </span>
          {!collapsed && <span className="font-medium">{label}</span>}
        </a>
      )
    }

    return (
      <Link
        href={href}
        className={baseClasses}
        onClick={() => setMobileOpen(false)}
      >
        <span className={`flex-shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-primary-500'}`}>
          {icon}
        </span>
        {!collapsed && <span className="font-medium">{label}</span>}
      </Link>
    )
  }

  // Icons
  const DashboardIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )

  const ParticipantsIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )

  const DelegatesIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )

  const InviteReviewerIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  )

  const InviteDelegateIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )

  const ManageReviewersIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )

  const SubmitIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )

  const MySubmissionsIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )

  const ProfileIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )

  const GuidelinesIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )

  const LogoutIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )

  const CollapseIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
    </svg>
  )

  const MenuIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )

  const CloseIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )

  // Don't render sidebar for non-authenticated users
  if (!user) {
    return null
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <img src="/wfc-logo.svg" alt="WFC Biennial Congress 2029" className="h-10 w-auto" />
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {mobileOpen ? CloseIcon : MenuIcon}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transition-all duration-300 flex flex-col ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className={`p-4 border-b border-gray-100 ${collapsed ? 'flex justify-center' : ''}`}>
          <Link href="/" className="flex items-center">
            {collapsed ? (
              <img src="/wfc-mark.svg" alt="WFC Biennial Congress 2029" className="w-10 h-10" />
            ) : (
              <img src="/wfc-logo.svg" alt="WFC Biennial Congress 2029" className="h-12 w-auto" />
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {user.isSuperAdmin ? (
            <>
              <NavLink href="/dashboard" icon={DashboardIcon} label="Abstracts" />
              <NavLink href="/delegates" icon={DelegatesIcon} label="Participants" />

              <div className={`pt-4 pb-2 ${collapsed ? 'hidden' : ''}`}>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4">
                  Administration
                </span>
              </div>
              <NavLink href="/manage-reviewers" icon={ManageReviewersIcon} label="Manage Reviewers" />

              <div className={`pt-4 pb-2 ${collapsed ? 'hidden' : ''}`}>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4">
                  Invitations
                </span>
              </div>
              <NavLink href="/invite-staff" icon={InviteReviewerIcon} label="Invite Reviewer" />
            </>
          ) : user.isStaff ? (
            <>
              <NavLink href="/dashboard" icon={DashboardIcon} label="Abstracts" />
            </>
          ) : (
            <>
              <NavLink href="/submit" icon={SubmitIcon} label="Submit Abstract" />
              <NavLink href="/my-submissions" icon={MySubmissionsIcon} label="My Submissions" />
            </>
          )}

          <div className={`pt-4 pb-2 ${collapsed ? 'hidden' : ''}`}>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4">
              Account
            </span>
          </div>

          <NavLink href="/profile" icon={ProfileIcon} label="Profile" />

          <div className={`pt-4 pb-2 ${collapsed ? 'hidden' : ''}`}>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4">
              Resources
            </span>
          </div>

          <NavLink
            href={user.isStaff || user.isSuperAdmin ? '/reviewer-guidelines.pdf' : 'https://www.wfc.org'}
            icon={GuidelinesIcon}
            label={user.isStaff || user.isSuperAdmin ? 'Reviewer Guidelines' : 'Abstract Guidelines'}
            external
          />
        </nav>

        {/* User & Logout */}
        <div className="p-4 border-t border-gray-100">
          {!collapsed && (
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors group ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <span className="text-gray-400 group-hover:text-red-500">{LogoutIcon}</span>
            {!collapsed && <span className="font-medium">Logout</span>}
          </button>

          {/* Collapse Toggle - Desktop only */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`hidden lg:flex items-center gap-3 w-full px-4 py-3 mt-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <span className="text-gray-400">{CollapseIcon}</span>
            {!collapsed && <span className="font-medium">Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
