import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthContext';

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Multi-Shop Sales &amp; Inventory</p>
          <p className="text-xs text-slate-400">
            {user?.fullName} · {user?.role}
          </p>
        </div>
        <button
          onClick={() => logout()}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-900"
        >
          Sign out
        </button>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
