import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { BillSequenceEvent, Shop } from '@/types/domain';

export default function BillSequencePage() {
  const [events, setEvents] = useState<BillSequenceEvent[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolution modal
  const [selectedEvent, setSelectedEvent] = useState<BillSequenceEvent | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState<'RESOLVED' | 'ACKNOWLEDGED_NEW_PAD'>('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [newPadLabel, setNewPadLabel] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [evList, shopList] = await Promise.all([
        api.get<BillSequenceEvent[]>('/bill-sequence/events'),
        api.get<Shop[]>('/shops'),
      ]);
      setEvents(evList || []);
      setShops(shopList || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !resolutionNotes.trim()) return;

    try {
      await api.patch(`/bill-sequence/events/${selectedEvent.id}/resolve`, {
        status: resolutionStatus,
        resolutionNotes: resolutionNotes.trim(),
        openNewPad: resolutionStatus === 'ACKNOWLEDGED_NEW_PAD',
        newPadLabel: newPadLabel || undefined,
      });
      setShowResolveModal(false);
      setResolutionNotes('');
      setNewPadLabel('');
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to resolve sequence alert');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Bill-Number Sequence Monitoring
          </h1>
          <p className="text-sm text-slate-400">
            Detect missing bill numbers, sequence gaps, and handle physical bill-pad transitions for anti-theft cash audits.
          </p>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
            <p className="text-[11px] sm:text-xs text-slate-400">Total Events</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-white">{events.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
            <p className="text-[11px] sm:text-xs text-slate-400">Open Alerts</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-amber-400">
              {events.filter((e) => e.status === 'OPEN').length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
            <p className="text-[11px] sm:text-xs text-slate-400">Active Pads</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-emerald-400">{shops.length}</p>
          </div>
        </div>

        {/* Events Table / Mobile Cards */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Checking sequence ledger...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              ✓ No sequence discrepancies detected. All bill numbers are strictly continuous.
            </div>
          ) : (
            <>
              {/* Mobile Event Cards */}
              <div className="block sm:hidden divide-y divide-slate-800/80">
                {events.map((ev) => (
                  <div key={ev.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          ev.type === 'MISSING_NUMBER'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {ev.type.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          ev.status === 'OPEN'
                            ? 'bg-amber-500/20 text-amber-400'
                            : ev.status === 'ACKNOWLEDGED_NEW_PAD'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </div>

                    <div>
                      <span className="font-semibold text-white text-sm">
                        {ev.shop?.name || shops.find((s) => s.id === ev.shopId)?.name || 'Shop'}
                      </span>
                      <p className="text-xs text-slate-300 mt-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                        {ev.details}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">
                        {new Date(ev.createdAt).toLocaleDateString()} · {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {ev.status === 'OPEN' ? (
                        <button
                          id={`resolve-event-btn-mobile-${ev.id}`}
                          onClick={() => {
                            setSelectedEvent(ev);
                            setShowResolveModal(true);
                          }}
                          className="flex min-h-[44px] items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500 active:scale-95 transition"
                        >
                          Resolve Alert
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">
                          Resolved
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-medium uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5">Detected Time</th>
                      <th className="px-4 py-3.5">Event Type</th>
                      <th className="px-4 py-3.5">Shop</th>
                      <th className="px-4 py-3.5">Details</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {events.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3.5 text-xs text-slate-400">
                          {new Date(ev.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                              ev.type === 'MISSING_NUMBER'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {ev.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-200">
                          {ev.shop?.name || shops.find((s) => s.id === ev.shopId)?.name || 'Shop'}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-300 max-w-xs">{ev.details}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              ev.status === 'OPEN'
                                ? 'bg-amber-500/20 text-amber-400'
                                : ev.status === 'ACKNOWLEDGED_NEW_PAD'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {ev.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {ev.status === 'OPEN' ? (
                            <button
                              id={`resolve-event-btn-${ev.id}`}
                              onClick={() => {
                                setSelectedEvent(ev);
                                setShowResolveModal(true);
                              }}
                              className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                            >
                              Resolve Alert
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">
                              Resolved by {ev.resolvedBy?.fullName || 'Manager'}
                            </span>
                          )}
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

      {/* Modal: Resolve Event */}
      {showResolveModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">
              Resolve Sequence Alert ({selectedEvent.type})
            </h2>
            <p className="text-xs text-slate-400 mb-4">{selectedEvent.details}</p>

            <form onSubmit={handleResolve} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Resolution Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="resType"
                      checked={resolutionStatus === 'RESOLVED'}
                      onChange={() => setResolutionStatus('RESOLVED')}
                      className="accent-indigo-600"
                    />
                    <span>Audit Explanation (Physical slip cancelled, voided, or duplicate)</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="resType"
                      checked={resolutionStatus === 'ACKNOWLEDGED_NEW_PAD'}
                      onChange={() => setResolutionStatus('ACKNOWLEDGED_NEW_PAD')}
                      className="accent-indigo-600"
                    />
                    <span>Acknowledge New Physical Pad (Close old pad &amp; reset numbering sequence)</span>
                  </label>
                </div>
              </div>

              {resolutionStatus === 'ACKNOWLEDGED_NEW_PAD' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    New Bill Pad Identifier / Label
                  </label>
                  <input
                    id="new-pad-label-input"
                    type="text"
                    placeholder="e.g. Pad #2026-B (Bills 1-100)"
                    value={newPadLabel}
                    onChange={(e) => setNewPadLabel(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Investigation &amp; Resolution Notes *
                </label>
                <textarea
                  id="resolution-notes-textarea"
                  required
                  rows={3}
                  placeholder="Detail cashier confirmation, physical verification of voided slip, etc."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  id="confirm-sequence-resolution-btn"
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Confirm &amp; Close Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
