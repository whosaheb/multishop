import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { Bill } from '@/types/domain';

export default function MyBillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  // Modification Request Modal
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showModModal, setShowModModal] = useState(false);
  const [modReason, setModReason] = useState('');

  const fetchMyBills = async () => {
    setLoading(true);
    try {
      const data = await api.get<Bill[]>('/bills/my');
      setBills(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBills();
  }, []);

  const handleRequestModification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill || !modReason.trim()) return;

    try {
      await api.post(`/bills/${selectedBill.id}/modification-requests`, {
        reason: modReason.trim(),
      });
      alert('Modification request submitted for Manager review.');
      setShowModModal(false);
      setModReason('');
      fetchMyBills();
    } catch (e: any) {
      alert(e.message || 'Failed to submit modification request');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              My Submitted Bills
            </h1>
            <p className="text-sm text-slate-400">
              Track the status of bills you have submitted and request post-submission corrections.
            </p>
          </div>
          <Link
            id="create-new-bill-btn"
            to="/bills/create"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition text-center"
          >
            + New Bill
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading your bills...</div>
          ) : bills.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No bills submitted yet. Click "+ New Bill" to create your first bill!
            </div>
          ) : (
            <>
              {/* Mobile Card List (Thumb-Friendly) */}
              <div className="block sm:hidden divide-y divide-slate-800/80">
                {bills.map((b) => (
                  <div key={b.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-base">
                          #{b.billNumber}
                        </span>
                        {b.currentVersionNo > 1 && (
                          <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                            v{b.currentVersionNo}
                          </span>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
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

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{b.shop?.name || 'Shop'} · {new Date(b.billDate).toLocaleDateString()}</span>
                      <span>{b.items?.length || 1} item(s)</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Collected</span>
                        <span className="text-base font-bold text-emerald-400">
                          ₹{Number(b.actualAmount).toFixed(2)}
                        </span>
                      </div>

                      <button
                        id={`request-mod-btn-mobile-${b.id}`}
                        onClick={() => {
                          setSelectedBill(b);
                          setShowModModal(true);
                        }}
                        className="flex min-h-[44px] items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-600/10 px-3.5 py-2 text-xs font-semibold text-indigo-400 hover:bg-indigo-600 hover:text-white transition active:scale-95"
                      >
                        Request Correction
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-medium uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5">Bill #</th>
                      <th className="px-4 py-3.5">Shop</th>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5">Items</th>
                      <th className="px-4 py-3.5">Collected</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {bills.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3.5 font-bold text-white">
                          #{b.billNumber}
                          {b.currentVersionNo > 1 && (
                            <span className="ml-1 text-[10px] text-indigo-400 font-normal">
                              (v{b.currentVersionNo})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-300">{b.shop?.name}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-400">
                          {new Date(b.billDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-400">
                          {b.items?.length || 1} item(s)
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-emerald-400">
                          ₹{Number(b.actualAmount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              b.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : b.status === 'DISPUTED'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            id={`request-mod-btn-${b.id}`}
                            onClick={() => {
                              setSelectedBill(b);
                              setShowModModal(true);
                            }}
                            className="text-xs text-indigo-400 hover:text-indigo-300"
                          >
                            Request Correction
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal: Request Modification */}
      {showModModal && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">
              Request Bill Correction (#{selectedBill.billNumber})
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Explain the required change. A Manager or Admin will review and issue a revised version.
            </p>
            <form onSubmit={handleRequestModification} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Reason for Modification *
                </label>
                <textarea
                  id="mod-request-reason-input"
                  required
                  rows={3}
                  placeholder="e.g. Mistyped quantity: customer took 1.5kg instead of 2kg"
                  value={modReason}
                  onChange={(e) => setModReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModModal(false)}
                  className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  id="submit-mod-request-btn"
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
