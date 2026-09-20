import AppShell from '@/components/AppShell';

const stats = [
  { label: "Today's Sales", value: '₹0' },
  { label: 'Bills', value: '0' },
  { label: 'Pending Review', value: '0' },
  { label: 'Disputed Bills', value: '0' },
  { label: 'Total Discount', value: '₹0' },
];

/**
 * Admin/Manager landing dashboard. Figures are placeholders until the
 * reports module (Phase 7) is implemented against real bill/inventory data.
 */
export default function AdminManagerDashboard() {
  return (
    <AppShell>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className="mt-1 text-xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Shop performance</h2>
        <p className="text-sm text-slate-500">
          Shop-wise sales/discount/disputed breakdown lands here once the reports module (Phase 7) is built.
        </p>
      </div>
    </AppShell>
  );
}
