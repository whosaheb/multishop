import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { Bill } from '@/types/domain';

interface EmployeeStats {
  shopName: string;
  todaySales: number;
  todayBillsCount: number;
  approvedCount: number;
  pendingCount: number;
  disputedCount: number;
}

export default function EmployeeDashboard() {
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dashData, myBills] = await Promise.all([
          api.get<EmployeeStats>('/reports/dashboard/employee'),
          api.get<Bill[]>('/bills/my'),
        ]);
        setStats(dashData);
        setRecentBills(myBills?.slice(0, 5) || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Fast Action Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-900/60 to-slate-900 border border-indigo-500/30 p-4 sm:p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
                Assigned: {stats?.shopName || 'Main Outlet'}
              </span>
              <h1 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                Cashier Point of Sale
              </h1>
              <p className="text-xs text-slate-300">
                Issue customer bills, compute automated discounts, and upload receipts.
              </p>
            </div>
            <Link
              id="employee-create-bill-banner-btn"
              to="/bills/create"
              className="flex w-full sm:w-auto min-h-[48px] items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-500 active:scale-98 transition text-center"
            >
              + Create Bill Now
            </Link>
          </div>
        </div>

        {/* Today's Counters */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 sm:p-4">
            <p className="text-[11px] sm:text-xs text-slate-400">My Sales Today</p>
            <p className="mt-1 text-lg sm:text-xl font-bold text-emerald-400">
              {loading ? '...' : `₹${stats?.todaySales?.toFixed(2) ?? '0.00'}`}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 sm:p-4">
            <p className="text-[11px] sm:text-xs text-slate-400">Bills Submitted</p>
            <p className="mt-1 text-lg sm:text-xl font-bold text-white">
              {loading ? '...' : stats?.todayBillsCount ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 sm:p-4">
            <p className="text-[11px] sm:text-xs text-slate-400">Approved</p>
            <p className="mt-1 text-lg sm:text-xl font-bold text-emerald-400">
              {loading ? '...' : stats?.approvedCount ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 sm:p-4">
            <p className="text-[11px] sm:text-xs text-slate-400">Disputed / Action</p>
            <p
              className={`mt-1 text-lg sm:text-xl font-bold ${
                (stats?.disputedCount ?? 0) > 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              {loading ? '...' : stats?.disputedCount ?? 0}
            </p>
          </div>
        </div>

        {/* Recent Bills list */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 sm:px-5 sm:py-3.5">
            <h2 className="text-sm font-semibold text-slate-200">Recent Bills</h2>
            <Link to="/bills/my" className="min-h-[36px] flex items-center text-xs font-medium text-indigo-400 hover:text-indigo-300">
              View all bills →
            </Link>
          </div>

          <div className="divide-y divide-slate-800/80">
            {loading ? (
              <p className="p-6 text-center text-xs text-slate-500">Loading bills...</p>
            ) : recentBills.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">No bills submitted yet.</p>
            ) : (
              recentBills.map((b) => (
                <Link
                  key={b.id}
                  to="/bills/my"
                  className="flex items-center justify-between p-4 hover:bg-slate-800/40 active:bg-slate-800/60 transition min-h-[56px]"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white text-sm">Bill #{b.billNumber}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          b.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : b.status === 'DISPUTED'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(b.billDate).toLocaleDateString()} · {b.items?.length || 1} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-400 text-sm">
                      ₹{Number(b.actualAmount).toFixed(2)}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      View details →
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
