import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import NotificationsModal from '@/features/notifications/NotificationsModal';

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const fetchUnread = async () => {
    try {
      const count = await api.get<number>('/notifications/unread-count');
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const navLinks = [
    { label: 'Dashboard', to: '/', show: true },
    { label: 'New Bill', to: '/bills/create', show: true },
    { label: 'Review Queue', to: '/bills/review', show: isAdminOrManager },
    { label: 'My Bills', to: '/bills/my', show: true },
    { label: 'Inventory', to: '/inventory', show: isAdminOrManager },
    { label: 'Items & Pricing', to: '/items', show: isAdminOrManager },
    { label: 'Sequence Alerts', to: '/sequence-events', show: isAdminOrManager },
  ];

  const isCurrent = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2.5 min-h-[44px]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 font-bold text-white shadow-md shadow-indigo-600/30">
                M
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span className="text-base font-bold tracking-tight text-white">MultiShop</span>
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                    POS
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {user?.role === 'EMPLOYEE' ? 'Cashier Terminal' : `${user?.role || 'Admin'} Terminal`}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks
                .filter((link) => link.show)
                .map((link) => {
                  const active = isCurrent(link.to);
                  return (
                    <Link
                      key={link.to}
                      id={`nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                      to={link.to}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                        active
                          ? 'bg-slate-800 text-indigo-400 shadow-sm'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-3">
            {/* Notification Bell Button (min 44px tap target) */}
            <button
              id="notification-bell-btn"
              onClick={() => setShowNotifications(true)}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-850 hover:text-white transition active:scale-95"
              aria-label="View notifications"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-slate-950">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User Chip on tablet/desktop */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-200">{user?.fullName}</span>
              <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                {user?.role}
              </span>
            </div>

            {/* Logout button */}
            <button
              id="sign-out-btn"
              onClick={() => logout()}
              className="hidden sm:inline-flex min-h-[38px] items-center rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-850 hover:text-white transition"
            >
              Sign out
            </button>

            {/* Mobile menu trigger */}
            <button
              id="mobile-menu-trigger-btn"
              onClick={() => setShowMobileMenu(true)}
              className="flex md:hidden h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-900 transition active:scale-95"
              aria-label="Open navigation menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area with generous bottom spacing on mobile for bottom bar */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-6 sm:py-6 pb-28 md:pb-8">
        {children}
      </main>

      {/* Mobile-First Fixed Bottom Navigation Bar (thumb-accessible) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 flex md:hidden items-center justify-around border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-lg px-2 py-1.5 shadow-2xl"
      >
        {/* Dashboard */}
        <Link
          to="/"
          id="mobile-nav-home"
          className={`flex min-h-[48px] flex-1 flex-col items-center justify-center rounded-xl py-1 text-center transition ${
            isCurrent('/') && location.pathname === '/'
              ? 'text-indigo-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="mt-0.5 text-[10px] font-medium tracking-tight">Home</span>
        </Link>

        {/* Create Bill - Highlighted FAB Style */}
        <Link
          to="/bills/create"
          id="mobile-nav-create-bill"
          className={`flex min-h-[48px] flex-1 flex-col items-center justify-center rounded-xl py-1 text-center transition ${
            isCurrent('/bills/create')
              ? 'text-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-600/40">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="mt-0.5 text-[10px] font-semibold text-indigo-300">New Bill</span>
        </Link>

        {/* Primary Role Specific Action: Review or My Bills */}
        {isAdminOrManager ? (
          <Link
            to="/bills/review"
            id="mobile-nav-review"
            className={`flex min-h-[48px] flex-1 flex-col items-center justify-center rounded-xl py-1 text-center transition ${
              isCurrent('/bills/review')
                ? 'text-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="mt-0.5 text-[10px] font-medium tracking-tight">Review</span>
          </Link>
        ) : (
          <Link
            to="/bills/my"
            id="mobile-nav-my-bills"
            className={`flex min-h-[48px] flex-1 flex-col items-center justify-center rounded-xl py-1 text-center transition ${
              isCurrent('/bills/my')
                ? 'text-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="mt-0.5 text-[10px] font-medium tracking-tight">My Bills</span>
          </Link>
        )}

        {/* Inventory (for Admin/Mgr) or Review for Employees */}
        {isAdminOrManager ? (
          <Link
            to="/inventory"
            id="mobile-nav-inventory"
            className={`flex min-h-[48px] flex-1 flex-col items-center justify-center rounded-xl py-1 text-center transition ${
              isCurrent('/inventory')
                ? 'text-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="mt-0.5 text-[10px] font-medium tracking-tight">Stock</span>
          </Link>
        ) : null}

        {/* More Menu Trigger */}
        <button
          type="button"
          id="mobile-nav-more-btn"
          onClick={() => setShowMobileMenu(true)}
          className="flex min-h-[48px] flex-1 flex-col items-center justify-center rounded-xl py-1 text-center text-slate-400 hover:text-slate-200 transition"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="mt-0.5 text-[10px] font-medium tracking-tight">Menu</span>
        </button>
      </nav>

      {/* Mobile Slide-Up Menu Sheet */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm md:hidden animate-fade-in">
          <div
            className="flex-1"
            onClick={() => setShowMobileMenu(false)}
            aria-label="Close menu backdrop"
          />
          <div className="rounded-t-3xl border-t border-slate-800 bg-slate-900 p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            {/* Grab handle */}
            <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-700 mb-4" />

            {/* Profile Summary */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 font-bold text-white shadow-md">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{user?.fullName}</h3>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-300 uppercase">
                      {user?.role}
                    </span>
                    <span className="text-xs text-slate-400">{user?.mobileNumber}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileMenu(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Menu Links */}
            <div className="space-y-1 mb-6">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Navigation
              </p>
              {navLinks
                .filter((l) => l.show)
                .map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition ${
                      isCurrent(link.to)
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-200 hover:bg-slate-800/80'
                    }`}
                  >
                    <span>{link.label}</span>
                    <svg className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
            </div>

            {/* Quick Actions & Logout */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowMobileMenu(false);
                  setShowNotifications(true);
                }}
                className="flex w-full min-h-[44px] items-center justify-between rounded-xl bg-slate-800/60 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition"
              >
                <span>🔔 Notification Center</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {unreadCount} unread
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMobileMenu(false);
                  logout();
                }}
                className="flex w-full min-h-[48px] items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-sm font-semibold transition"
              >
                Sign out of account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUpdated={fetchUnread}
      />
    </div>
  );
}
