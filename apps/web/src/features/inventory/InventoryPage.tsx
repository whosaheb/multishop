import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { DerivedStock, InventoryTransaction, Item, Shop } from '@/types/domain';

export default function InventoryPage() {
  const [stockList, setStockList] = useState<DerivedStock[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab: Stock view or Ledger
  const [activeTab, setActiveTab] = useState<'STOCK' | 'LEDGER'>('STOCK');

  // Filters
  const [selectedShop, setSelectedShop] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Modals
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  // Receive form
  const [recShopId, setRecShopId] = useState('');
  const [recItemId, setRecItemId] = useState('');
  const [recQuantity, setRecQuantity] = useState('');
  const [recNote, setRecNote] = useState('');

  // Transfer form
  const [trFromShopId, setTrFromShopId] = useState('');
  const [trToShopId, setTrToShopId] = useState('');
  const [trItemId, setTrItemId] = useState('');
  const [trQuantity, setTrQuantity] = useState('');
  const [trReason, setTrReason] = useState('');

  // Adjustment form
  const [adjShopId, setAdjShopId] = useState('');
  const [adjItemId, setAdjItemId] = useState('');
  const [adjPhysicalStock, setAdjPhysicalStock] = useState('');
  const [adjReason, setAdjReason] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stocks, txns, shopList, itemList] = await Promise.all([
        api.get<DerivedStock[]>(`/inventory/stock${selectedShop ? `?shopId=${selectedShop}` : ''}`),
        api.get<InventoryTransaction[]>('/inventory/transactions'),
        api.get<Shop[]>('/shops'),
        api.get<Item[]>('/items'),
      ]);
      setStockList(stocks || []);
      setTransactions(txns || []);
      setShops(shopList || []);
      setItems(itemList || []);

      if (shopList && shopList.length > 0) {
        if (!recShopId) setRecShopId(shopList[0].id);
        if (!trFromShopId) setTrFromShopId(shopList[0].id);
        if (!trToShopId) setTrToShopId(shopList[1]?.id || shopList[0].id);
        if (!adjShopId) setAdjShopId(shopList[0].id);
      }
      if (itemList && itemList.length > 0) {
        if (!recItemId) setRecItemId(itemList[0].id);
        if (!trItemId) setTrItemId(itemList[0].id);
        if (!adjItemId) setAdjItemId(itemList[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedShop]);

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recShopId || !recItemId || !recQuantity || Number(recQuantity) <= 0) return;

    try {
      await api.post('/inventory/receive', {
        shopId: recShopId,
        itemId: recItemId,
        quantity: Number(recQuantity),
        note: recNote || undefined,
      });
      setShowReceiveModal(false);
      setRecQuantity('');
      setRecNote('');
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to receive stock');
    }
  };

  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trFromShopId || !trToShopId || !trItemId || !trQuantity || Number(trQuantity) <= 0) return;
    if (trFromShopId === trToShopId) return alert('Source and destination shops must differ');

    try {
      await api.post('/inventory/transfer', {
        fromShopId: trFromShopId,
        toShopId: trToShopId,
        itemId: trItemId,
        quantity: Number(trQuantity),
        reason: trReason || undefined,
      });
      setShowTransferModal(false);
      setTrQuantity('');
      setTrReason('');
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to transfer stock');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjShopId || !adjItemId || adjPhysicalStock === '' || !adjReason.trim()) return;

    try {
      await api.post('/inventory/adjustment', {
        shopId: adjShopId,
        itemId: adjItemId,
        physicalStock: Number(adjPhysicalStock),
        reason: adjReason.trim(),
      });
      setShowAdjustmentModal(false);
      setAdjPhysicalStock('');
      setAdjReason('');
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to record stock adjustment');
    }
  };

  // Derive current system stock for adjustment modal preview
  const currentAdjSystemStock =
    stockList.find((s) => s.shopId === adjShopId && s.itemId === adjItemId)?.currentStock ?? 0;
  const adjDelta = Number(adjPhysicalStock) - currentAdjSystemStock;

  const filteredStock = stockList.filter((s) =>
    s.itemName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header and Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Derived Inventory Ledger
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Stock is strictly derived by summing historical ledger movements — no stored static totals.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
            <button
              id="receive-stock-btn"
              onClick={() => setShowReceiveModal(true)}
              className="flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500 active:scale-95 transition text-center"
            >
              + Receive
            </button>
            <button
              id="transfer-stock-btn"
              onClick={() => setShowTransferModal(true)}
              className="flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 active:scale-95 transition text-center"
            >
              ⇄ Transfer
            </button>
            <button
              id="adjust-stock-btn"
              onClick={() => setShowAdjustmentModal(true)}
              className="flex min-h-[44px] items-center justify-center rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-900/50 active:scale-95 transition text-center"
            >
              ± Reconcile
            </button>
          </div>
        </div>

        {/* Tab & Filter bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex space-x-1 rounded-xl bg-slate-900 p-1 border border-slate-800">
            <button
              id="tab-stock-btn"
              onClick={() => setActiveTab('STOCK')}
              className={`flex-1 sm:flex-initial min-h-[38px] rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                activeTab === 'STOCK'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Current Stock
            </button>
            <button
              id="tab-ledger-btn"
              onClick={() => setActiveTab('LEDGER')}
              className={`flex-1 sm:flex-initial min-h-[38px] rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                activeTab === 'LEDGER'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ledger ({transactions.length})
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:space-x-3">
            <input
              id="search-inventory-input"
              type="text"
              placeholder="Search item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-[40px] rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            <select
              id="inventory-shop-filter"
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="min-h-[40px] rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Shops</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab 1: Current Stock Table */}
        {activeTab === 'STOCK' && (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Deriving stock from transaction history...
              </div>
            ) : filteredStock.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No stock records found.</div>
            ) : (
              <>
                {/* Mobile Stock Cards */}
                <div className="block sm:hidden divide-y divide-slate-800/80">
                  {filteredStock.map((s, idx) => {
                    const isNegative = s.currentStock < 0;
                    const isLow = s.currentStock >= 0 && s.currentStock < 5000;
                    return (
                      <div key={idx} className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-bold text-white text-sm">{s.itemName}</span>
                            <p className="text-xs text-slate-400">{s.shopName}</p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              isNegative
                                ? 'bg-rose-500/20 text-rose-400'
                                : isLow
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {isNegative ? 'Negative' : isLow ? 'Low Stock' : 'In Stock'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                            {s.categoryName}
                          </span>
                          <span
                            className={`text-base font-mono font-bold ${
                              isNegative
                                ? 'text-rose-400'
                                : isLow
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {s.currentStock.toLocaleString()} {s.baseUnit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-medium uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-5 py-3.5">Shop / Location</th>
                        <th className="px-4 py-3.5">Product Name</th>
                        <th className="px-4 py-3.5">Category</th>
                        <th className="px-4 py-3.5 text-right">Base Stock (Derived)</th>
                        <th className="px-5 py-3.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredStock.map((s, idx) => {
                        const isNegative = s.currentStock < 0;
                        const isLow = s.currentStock >= 0 && s.currentStock < 5000;
                        return (
                          <tr key={idx} className="hover:bg-slate-800/30 transition">
                            <td className="px-5 py-3.5 font-medium text-slate-200">{s.shopName}</td>
                            <td className="px-4 py-3.5 text-slate-100 font-semibold">{s.itemName}</td>
                            <td className="px-4 py-3.5 text-xs text-slate-400">{s.categoryName}</td>
                            <td className="px-4 py-3.5 text-right font-mono font-bold">
                              <span
                                className={
                                  isNegative
                                    ? 'text-rose-400'
                                    : isLow
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }
                              >
                                {s.currentStock.toLocaleString()} {s.baseUnit}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              {isNegative ? (
                                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-300">
                                  Negative Stock
                                </span>
                              ) : isLow ? (
                                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                                  Low Stock
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
                                  In Stock
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 2: Transaction Ledger */}
        {activeTab === 'LEDGER' && (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow">
            {/* Mobile Ledger Cards */}
            <div className="block sm:hidden divide-y divide-slate-800/80">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">No ledger transactions found.</div>
              ) : (
                transactions.map((tx) => {
                  const isPositive = Number(tx.quantityChange) > 0;
                  return (
                    <div key={tx.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            tx.type === 'RECEIVE'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : tx.type === 'BILL_SALE'
                              ? 'bg-sky-500/20 text-sky-300'
                              : tx.type === 'TRANSFER_OUT' || tx.type === 'TRANSFER_IN'
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {tx.type}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <span className="font-semibold text-white text-sm">
                            {tx.item?.name || items.find((i) => i.id === tx.itemId)?.name || 'Item'}
                          </span>
                          <p className="text-xs text-slate-400">
                            {tx.shop?.name || shops.find((s) => s.id === tx.shopId)?.name || 'Shop'}
                          </p>
                        </div>

                        <span
                          className={`font-mono font-bold text-base ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {Number(tx.quantityChange).toLocaleString()}
                        </span>
                      </div>

                      {tx.note && (
                        <p className="text-[11px] text-slate-400 italic bg-slate-950/60 rounded-lg p-2 border border-slate-800/60">
                          {tx.note}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-medium uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Timestamp</th>
                    <th className="px-4 py-3.5">Type</th>
                    <th className="px-4 py-3.5">Shop</th>
                    <th className="px-4 py-3.5">Item</th>
                    <th className="px-4 py-3.5 text-right">Quantity Delta</th>
                    <th className="px-5 py-3.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {transactions.map((tx) => {
                    const isPositive = Number(tx.quantityChange) > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3.5 text-xs text-slate-400">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                              tx.type === 'RECEIVE'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : tx.type === 'BILL_SALE'
                                ? 'bg-sky-500/20 text-sky-300'
                                : tx.type === 'TRANSFER_OUT' || tx.type === 'TRANSFER_IN'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-300">
                          {tx.shop?.name || shops.find((s) => s.id === tx.shopId)?.name || 'Shop'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-200">
                          {tx.item?.name || items.find((i) => i.id === tx.itemId)?.name || 'Item'}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-semibold">
                          <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                            {isPositive ? '+' : ''}
                            {Number(tx.quantityChange).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-400">{tx.note || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Receive Stock */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Receive Inward Stock (RECEIVE)</h2>
            <form onSubmit={handleReceiveStock} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Destination Shop</label>
                <select
                  id="receive-shop-select"
                  value={recShopId}
                  onChange={(e) => setRecShopId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Item</label>
                <select
                  id="receive-item-select"
                  value={recItemId}
                  onChange={(e) => setRecItemId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Base: {i.baseUnit?.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Quantity (in base unit, e.g. grams / ml)
                </label>
                <input
                  id="receive-quantity-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 25000"
                  value={recQuantity}
                  onChange={(e) => setRecQuantity(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Invoice / Batch Note
                </label>
                <input
                  id="receive-note-input"
                  type="text"
                  placeholder="e.g. Morning delivery from Central Kitchen"
                  value={recNote}
                  onChange={(e) => setRecNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  id="confirm-receive-btn"
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Post Receive Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transfer Stock */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Stock Transfer Between Shops</h2>
            <form onSubmit={handleTransferStock} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">From Shop</label>
                  <select
                    id="transfer-from-select"
                    value={trFromShopId}
                    onChange={(e) => setTrFromShopId(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">To Shop</label>
                  <select
                    id="transfer-to-select"
                    value={trToShopId}
                    onChange={(e) => setTrToShopId(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Item</label>
                <select
                  id="transfer-item-select"
                  value={trItemId}
                  onChange={(e) => setTrItemId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Base: {i.baseUnit?.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Transfer Quantity (in base unit)
                </label>
                <input
                  id="transfer-quantity-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={trQuantity}
                  onChange={(e) => setTrQuantity(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Reason (optional)</label>
                <input
                  id="transfer-reason-input"
                  type="text"
                  placeholder="e.g. Replenishing high weekend demand"
                  value={trReason}
                  onChange={(e) => setTrReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  id="confirm-transfer-btn"
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Post Transfer Pair
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Physical Stock Adjustment */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Reconcile Physical Count (ADJUSTMENT)</h2>
            <p className="text-xs text-slate-400 mb-4">
              Compares physical stock against system ledger and records the delta with a mandatory audit reason.
            </p>
            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Shop</label>
                <select
                  id="adjust-shop-select"
                  value={adjShopId}
                  onChange={(e) => setAdjShopId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Item</label>
                <select
                  id="adjust-item-select"
                  value={adjItemId}
                  onChange={(e) => setAdjItemId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Base: {i.baseUnit?.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl bg-slate-950 p-3 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Current System Stock:</span>
                  <span className="font-mono text-slate-200">{currentAdjSystemStock}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Calculated Delta:</span>
                  <span className={`font-mono font-bold ${adjDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {adjDelta >= 0 ? `+${adjDelta}` : adjDelta}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Actual Physical Count *
                </label>
                <input
                  id="physical-stock-input"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0"
                  value={adjPhysicalStock}
                  onChange={(e) => setAdjPhysicalStock(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mandatory Reconciliation Reason *
                </label>
                <textarea
                  id="adjustment-reason-input"
                  required
                  rows={2}
                  placeholder="e.g. Physical inventory audit discrepancy, minor spillage during transfer"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  id="confirm-adjustment-btn"
                  type="submit"
                  className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500"
                >
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
