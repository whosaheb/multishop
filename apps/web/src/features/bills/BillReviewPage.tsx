import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { Bill, Shop } from '@/types/domain';

export default function BillReviewPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('SUBMITTED');
  const [selectedShop, setSelectedShop] = useState<string>('');

  // Selected bill for detail view
  const [activeBill, setActiveBill] = useState<Bill | null>(null);

  // Dispute modal
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  // Resolve modification modal
  const [showResolveModModal, setShowResolveModModal] = useState(false);
  const [targetModRequestId, setTargetModRequestId] = useState<string>('');
  const [modResolutionNotes, setModResolutionNotes] = useState('');
  const [revisedAmount, setRevisedAmount] = useState('');

  const fetchBills = async () => {
    setLoading(true);
    try {
      const [allBills, allShops] = await Promise.all([
        api.get<Bill[]>('/bills'),
        api.get<Shop[]>('/shops'),
      ]);
      setBills(allBills || []);
      setShops(allShops || []);

      if (activeBill) {
        const refreshed = allBills?.find((b) => b.id === activeBill.id);
        if (refreshed) setActiveBill(refreshed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handleApprove = async (billId: string) => {
    try {
      await api.post(`/bills/${billId}/review`, {
        decision: 'APPROVED',
      });
      fetchBills();
      if (activeBill?.id === billId) {
        setActiveBill((prev) => (prev ? { ...prev, status: 'APPROVED' } : null));
      }
    } catch (e: any) {
      alert(e.message || 'Failed to approve bill');
    }
  };

  const handleDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBill || !disputeReason.trim()) return;

    try {
      await api.post(`/bills/${activeBill.id}/review`, {
        decision: 'DISPUTED',
        reason: disputeReason.trim(),
      });
      setShowDisputeModal(false);
      setDisputeReason('');
      fetchBills();
    } catch (e: any) {
      alert(e.message || 'Failed to dispute bill');
    }
  };

  const handleResolveModification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetModRequestId || !modResolutionNotes.trim()) return;

    try {
      await api.patch(`/bills/modification-requests/${targetModRequestId}/resolve`, {
        status: 'RESOLVED',
        resolutionReason: modResolutionNotes.trim(),
        revisedActualAmount: revisedAmount ? Number(revisedAmount) : undefined,
      });
      setShowResolveModModal(false);
      setModResolutionNotes('');
      setRevisedAmount('');
      fetchBills();
    } catch (e: any) {
      alert(e.message || 'Failed to resolve modification');
    }
  };

  const filteredBills = bills.filter((b) => {
    const matchesStatus =
      selectedStatus === 'ALL'
        ? true
        : selectedStatus === 'SUBMITTED'
        ? b.status === 'SUBMITTED' || b.status === 'UNDER_REVIEW'
        : b.status === selectedStatus;
    const matchesShop = selectedShop ? b.shopId === selectedShop : true;
    return matchesStatus && matchesShop;
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Bill Review &amp; Verification Queue
          </h1>
          <p className="text-sm text-slate-400">
            Audit submitted bills, verify photo slips, approve or dispute, and manage immutable version revisions.
          </p>
        </div>

        {/* Filters and Tabs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex overflow-x-auto no-scrollbar space-x-1 rounded-xl bg-slate-900 p-1 border border-slate-800">
            {['SUBMITTED', 'APPROVED', 'DISPUTED', 'ALL'].map((tab) => (
              <button
                key={tab}
                id={`filter-tab-${tab.toLowerCase()}`}
                onClick={() => setSelectedStatus(tab)}
                className={`min-h-[38px] whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  selectedStatus === tab
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'SUBMITTED' ? 'Pending Review' : tab}
              </button>
            ))}
          </div>

          <select
            id="filter-shop-select"
            value={selectedShop}
            onChange={(e) => setSelectedShop(e.target.value)}
            className="min-h-[40px] rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Shops ({shops.length})</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Bills Grid / List */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* List column */}
          <div className="lg:col-span-7 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-500">
                Loading bills queue...
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-500">
                No bills found in this view.
              </div>
            ) : (
              filteredBills.map((b) => {
                const isSelected = activeBill?.id === b.id;
                return (
                  <div
                    key={b.id}
                    id={`bill-row-${b.id}`}
                    onClick={() => {
                      setActiveBill(b);
                      if (window.innerWidth < 1024) {
                        setTimeout(() => {
                          document.getElementById('bill-detail-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 60);
                      }
                    }}
                    className={`cursor-pointer rounded-2xl border p-4 sm:p-4.5 transition active:scale-98 ${
                      isSelected
                        ? 'border-indigo-500 bg-slate-900 ring-1 ring-indigo-500 shadow-md'
                        : 'border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-base">
                            Bill #{b.billNumber}
                          </span>
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
                          {b.currentVersionNo > 1 && (
                            <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[10px] font-medium text-indigo-300">
                              v{b.currentVersionNo}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {b.shop?.name || 'Shop'} · By {b.createdBy?.fullName || 'Cashier'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-bold text-emerald-400">
                          ₹{Number(b.actualAmount).toFixed(2)}
                        </span>
                        {b.discountAmount > 0 && (
                          <p className="text-[11px] text-amber-400">
                            Discount: ₹{Number(b.discountAmount).toFixed(2)} ({b.discountPercent?.toFixed(1)}%)
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-2.5 text-xs text-slate-500">
                      <span>{new Date(b.billDate).toLocaleString()}</span>
                      <div className="flex items-center space-x-2">
                        {b.attachment && (
                          <span className="text-slate-400 flex items-center gap-1">
                            📷 Photo Attached
                          </span>
                        )}
                        <span>{b.items?.length || 0} items</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Detail / Inspector Column */}
          <div className="lg:col-span-5">
            {activeBill ? (
              <div
                id="bill-detail-card"
                className="sticky top-20 rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-5 shadow-xl"
              >
                {/* Header info */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Bill #{activeBill.billNumber}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Version {activeBill.currentVersionNo} · {activeBill.shop?.name}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      activeBill.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : activeBill.status === 'DISPUTED'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {activeBill.status}
                  </span>
                </div>

                {/* Photo slip preview */}
                {activeBill.attachment ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2">
                    <p className="text-xs font-medium text-slate-300">Physical Photo Slip</p>
                    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                      <div className="h-40 flex items-center justify-center bg-slate-950/80 p-2">
                        <div className="text-center space-y-1">
                          <p className="text-xs text-slate-400 font-mono">
                            {activeBill.attachment.objectKey}
                          </p>
                          <p className="text-[10px] text-emerald-400">
                            Verified Upload · {(activeBill.attachment.sizeBytes / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-800 p-3 text-center text-xs text-slate-500">
                    No physical slip photo attached.
                  </div>
                )}

                {/* Line Items Table */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-300">Line Items</p>
                  <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1">
                    {activeBill.items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 text-xs"
                      >
                        <div>
                          <p className="font-medium text-slate-200">{item.item?.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {item.quantity} {item.unitLabel} × ₹{item.pricePerUnit}
                          </p>
                        </div>
                        <span className="font-semibold text-slate-300">
                          ₹{Number(item.lineAmount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Amounts Summary */}
                <div className="rounded-xl bg-slate-950 p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Calculated Total:</span>
                    <span>₹{Number(activeBill.calculatedAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Discount Given:</span>
                    <span className="text-amber-400">
                      ₹{Number(activeBill.discountAmount).toFixed(2)} ({activeBill.discountPercent?.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-100 border-t border-slate-800/80 pt-1.5">
                    <span>Actual Collected:</span>
                    <span className="text-emerald-400">
                      ₹{Number(activeBill.actualAmount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Reviews / Dispute Reasons */}
                {activeBill.reviews && activeBill.reviews.length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-1">
                    <p className="font-semibold text-slate-300">Review Notes</p>
                    {activeBill.reviews.map((r) => (
                      <p key={r.id} className="text-slate-400">
                        <span className="text-slate-200 font-medium">[{r.decision}]</span>{' '}
                        {r.reason || 'Verified and approved.'}
                      </p>
                    ))}
                  </div>
                )}

                {/* Pending Modification Requests */}
                {activeBill.modificationRequests?.filter((m) => m.status === 'PENDING').map((mr) => (
                  <div
                    key={mr.id}
                    className="rounded-xl border border-purple-500/40 bg-purple-950/20 p-3 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-300">Change Request Pending</span>
                      <button
                        id={`resolve-mod-btn-${mr.id}`}
                        onClick={() => {
                          setTargetModRequestId(mr.id);
                          setRevisedAmount(String(activeBill.actualAmount));
                          setShowResolveModModal(true);
                        }}
                        className="rounded bg-purple-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-purple-500"
                      >
                        Resolve &amp; Revise
                      </button>
                    </div>
                    <p className="text-slate-300">Reason: {mr.reason}</p>
                    <p className="text-[10px] text-slate-500">Requested by: {mr.requestedBy?.fullName}</p>
                  </div>
                ))}

                {/* Actions: Approve / Dispute */}
                <div className="flex gap-2 pt-2">
                  <button
                    id="approve-bill-btn"
                    onClick={() => handleApprove(activeBill.id)}
                    className="flex-1 min-h-[48px] rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow hover:bg-emerald-500 active:scale-95 transition"
                  >
                    ✓ Approve Bill
                  </button>
                  <button
                    id="dispute-bill-btn"
                    onClick={() => setShowDisputeModal(true)}
                    className="flex-1 min-h-[48px] rounded-xl border border-rose-500/40 bg-rose-950/40 py-3 text-xs font-bold text-rose-300 hover:bg-rose-900/60 active:scale-95 transition"
                  >
                    ✕ Dispute Bill
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center text-xs text-slate-500">
                Select a bill from the left list to inspect slip, line items, and audit actions.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Dispute Bill */}
      {showDisputeModal && activeBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Dispute Bill #{activeBill.billNumber}</h2>
            <p className="text-xs text-slate-400 mb-4">
              Disputing flags the bill and notifies the cashier with the specified reason.
            </p>
            <form onSubmit={handleDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Dispute Reason *
                </label>
                <textarea
                  id="dispute-reason-input"
                  required
                  rows={3}
                  placeholder="e.g. Photo slip doesn't match total, or missing discount approval"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100 focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  id="confirm-dispute-btn"
                  type="submit"
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  Confirm Dispute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resolve Modification Request (Creates new immutable BillVersion) */}
      {showResolveModModal && activeBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">
              Resolve Change Request &amp; Create Version {activeBill.currentVersionNo + 1}
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              The original version remains immutable in the ledger. A new version will be issued and inventory delta reconciled.
            </p>
            <form onSubmit={handleResolveModification} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Revised Collected Amount (₹)
                </label>
                <input
                  id="revised-amount-input"
                  type="number"
                  step="0.01"
                  required
                  value={revisedAmount}
                  onChange={(e) => setRevisedAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Resolution Notes &amp; Revision Reason *
                </label>
                <textarea
                  id="resolution-notes-input"
                  required
                  rows={3}
                  placeholder="e.g. Corrected manual discount typo per manager approval"
                  value={modResolutionNotes}
                  onChange={(e) => setModResolutionNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModModal(false)}
                  className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  id="confirm-revision-btn"
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Publish New Version (v{activeBill.currentVersionNo + 1})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
