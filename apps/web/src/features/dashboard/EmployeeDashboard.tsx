import AppShell from '@/components/AppShell';

/**
 * Employee's mobile-first home: the fast path to "create a bill". Bill
 * creation itself (Phase 3) plugs in as a route/component here.
 */
export default function EmployeeDashboard() {
  return (
    <AppShell>
      <div className="grid gap-4">
        <button className="rounded-xl bg-indigo-600 px-4 py-4 text-left font-medium text-white shadow hover:bg-indigo-500">
          + Create Bill
        </button>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Recent bills</h2>
          <p className="text-sm text-slate-500">
            Your submitted bills will appear here once bill entry (Phase 3) is wired up.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
