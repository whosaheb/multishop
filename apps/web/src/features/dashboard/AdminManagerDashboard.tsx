import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

interface DashboardStats {
  todaySales: number;
  todayBillsCount: number;
  pendingReviewCount: number;
  disputedCount: number;
  totalDiscountToday: number;
  shopPerformance: {
    shopId: string;
    shopName: string;
    sales: number;
    billsCount: number;
    discount: number;
  }[];
}

export default function AdminManagerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await api.get<DashboardStats>('/reports/dashboard/admin-manager');
        setStats(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header and Quick Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Operations &amp; Sales Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Real-time multi-shop sales performance, review backlog, and audit telemetry.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
            <Link
              id="action-new-bill"
              to="/bills/create"
              className="flex min-h-[44px] items-center justify-center rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-500 active:scale-95 transition text-center"
            >
              + New Bill
            </Link>
            <Link
              id="action-review-queue"
              to="/bills/review"
              className="flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 active:scale-95 transition text-center"
            >
              Review
            </Link>
            <Link
              id="action-inventory"
              to="/inventory"
              className="flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 active:scale-95 transition text-center"
            >
              Inventory
            </Link>
          </div>
        </div>

        {/* 5-Metric Cards Grid with balanced mobile columns */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 sm:p-4 shadow-sm">
            <p className="text-[11px] sm:text-xs font-medium text-slate-400">Today's Sales</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-emerald-400">
              {loading ? '...' : `₹${stats?.todaySales?.toFixed(2) ?? '0.00'}`}
            </p>
            <p className="mt-1 text-[10px] sm:text-[11px] text-slate-500">All shops total</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 sm:p-4 shadow-sm">
            <p className="text-[11px] sm:text-xs font-medium text-slate-400">Bills Created</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-white">
              {loading ? '...' : stats?.todayBillsCount ?? 0}
            </p>
            <p className="mt-1 text-[10px] sm:text-[11px] text-slate-500">Invoices issued today</p>
          </div>

          <Link
            to="/bills/review"
            className="group rounded-2xl border border-slate-800 bg-slate-900 p-3.5 sm:p-4 shadow-sm transition hover:border-amber-500/50 hover:bg-slate-850 active:scale-98"
          >
            <p className="text-[11px] sm:text-xs font-medium text-slate-400">Pending Review</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-amber-400">
              {loading ? '...' : stats?.pendingReviewCount ?? 0}
            </p>
            <p className="mt-1 text-[10px] sm:text-[11px] text-indigo-400 group-hover:underline">
              Inspect in queue →
            </p>
          </Link>

          <Link
            to="/bills/review"
            className="group rounded-2xl border border-slate-800 bg-slate-900 p-3.5 sm:p-4 shadow-sm transition hover:border-rose-500/50 hover:bg-slate-850 active:scale-98"
          >
            <p className="text-[11px] sm:text-xs font-medium text-slate-400">Disputed Bills</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-rose-400">
              {loading ? '...' : stats?.disputedCount ?? 0}
            </p>
            <p className="mt-1 text-[10px] sm:text-[11px] text-rose-400 group-hover:underline">
              Cashier action →
            </p>
          </Link>

          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-800 bg-slate-900 p-3.5 sm:p-4 shadow-sm">
            <p className="text-[11px] sm:text-xs font-medium text-slate-400">Total Discount</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-amber-300">
              {loading ? '...' : `₹${stats?.totalDiscountToday?.toFixed(2) ?? '0.00'}`}
            </p>
            <p className="mt-1 text-[10px] sm:text-[11px] text-slate-500">Derived from line items</p>
          </div>
        </div>

        {/* Shop Performance (Mobile Cards + Desktop Table) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow">
          <div className="border-b border-slate-800 px-4 py-3 sm:px-5 sm:py-4">
            <h2 className="text-sm font-semibold text-slate-200">Shop-wise Performance Today</h2>
            <p className="text-xs text-slate-400">
              Comparative revenue, bill volume, and customer discount per retail shop.
            </p>
          </div>

          {/* Mobile Card List */}
          <div className="block sm:hidden divide-y divide-slate-800/80">
            {stats?.shopPerformance?.map((sp) => (
              <div key={sp.shopId} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{sp.shopName}</span>
                  <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
                    {sp.billsCount} {sp.billsCount === 1 ? 'bill' : 'bills'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400">
                    Discount: <span className="text-amber-400 font-medium">₹{sp.discount.toFixed(2)}</span>
                  </span>
                  <span className="text-base font-bold text-emerald-400">
                    ₹{sp.sales.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-medium uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Shop Name</th>
                  <th className="px-4 py-3.5 text-right">Bills Issued</th>
                  <th className="px-4 py-3.5 text-right">Total Discount Given</th>
                  <th className="px-5 py-3.5 text-right">Net Sales Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {stats?.shopPerformance?.map((sp) => (
                  <tr key={sp.shopId} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3.5 font-medium text-white">{sp.shopName}</td>
                    <td className="px-4 py-3.5 text-right text-slate-300">{sp.billsCount}</td>
                    <td className="px-4 py-3.5 text-right text-amber-400">
                      ₹{sp.discount.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-400">
                      ₹{sp.sales.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
