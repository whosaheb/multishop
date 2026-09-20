import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { Category, Item, Unit } from '@/types/domain';

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedItemForPrice, setSelectedItemForPrice] = useState<Item | null>(null);
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false);
  const [historyItem, setHistoryItem] = useState<Item | null>(null);

  // Form states
  const [itemName, setItemName] = useState('');
  const [itemCatId, setItemCatId] = useState('');
  const [baseUnitId, setBaseUnitId] = useState('');
  const [sellingUnitId, setSellingUnitId] = useState('');
  const [initialPrice, setInitialPrice] = useState('');

  const [categoryName, setCategoryName] = useState('');

  const [newPrice, setNewPrice] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().slice(0, 16),
  );

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemList, catList, unitList] = await Promise.all([
        api.get<Item[]>('/items'),
        api.get<Category[]>('/items/categories'),
        api.get<Unit[]>('/items/units'),
      ]);
      setItems(itemList || []);
      setCategories(catList || []);
      setUnits(unitList || []);
      if (unitList && unitList.length > 0) {
        setBaseUnitId(unitList[0].id);
        setSellingUnitId(unitList[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    try {
      await api.post('/items/categories', { name: categoryName.trim() });
      setCategoryName('');
      setShowCategoryModal(false);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to create category');
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !baseUnitId || !sellingUnitId || !initialPrice) return;
    try {
      await api.post('/items', {
        name: itemName.trim(),
        categoryId: itemCatId || undefined,
        baseUnitId,
        sellingUnitId,
        initialPrice: Number(initialPrice),
      });
      setItemName('');
      setInitialPrice('');
      setShowItemModal(false);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to create item');
    }
  };

  const handleSetPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForPrice || !newPrice || !effectiveDate) return;
    try {
      await api.post(`/items/${selectedItemForPrice.id}/prices`, {
        pricePerUnit: Number(newPrice),
        effectiveDate: new Date(effectiveDate).toISOString(),
      });
      setShowPriceModal(false);
      setNewPrice('');
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to set price');
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCategory ? item.categoryId === filterCategory : true;
    return matchesSearch && matchesCat;
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Items, Categories &amp; Pricing
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Manage product master catalog, unit conversions, and date-effective prices.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <button
              id="add-category-btn"
              onClick={() => setShowCategoryModal(true)}
              className="flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 active:scale-95 transition text-center"
            >
              + Category
            </button>
            <button
              id="add-item-btn"
              onClick={() => setShowItemModal(true)}
              className="flex min-h-[44px] items-center justify-center rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500 active:scale-95 transition text-center"
            >
              + Create Item
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="relative">
            <input
              id="search-items-input"
              type="text"
              placeholder="Search items by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <select
            id="filter-category-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs sm:text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Items Container */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading catalog...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No items match your filter criteria.
            </div>
          ) : (
            <>
              {/* Mobile Item Cards */}
              <div className="block sm:hidden divide-y divide-slate-800/80">
                {filteredItems.map((item) => {
                  const latestPrice = item.prices?.[0]?.pricePerUnit ?? 0;
                  return (
                    <div key={item.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-bold text-white text-base">{item.name}</span>
                          <span className="ml-2 inline-block rounded-md bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                            {item.category?.name || 'Uncategorized'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-bold text-emerald-400">
                            ₹{latestPrice}
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            per {item.sellingUnit?.symbol}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-slate-400 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50">
                        <span>Inv Base: <strong className="text-slate-200">{item.baseUnit?.symbol}</strong></span>
                        <span>·</span>
                        <span>Bill Unit: <strong className="text-slate-200">{item.sellingUnit?.symbol}</strong></span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          id={`set-price-btn-mobile-${item.id}`}
                          onClick={() => {
                            setSelectedItemForPrice(item);
                            setNewPrice(String(latestPrice));
                            setShowPriceModal(true);
                          }}
                          className="flex min-h-[44px] items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-600/10 px-3 py-2 text-xs font-semibold text-indigo-400 hover:bg-indigo-600 hover:text-white active:scale-95 transition"
                        >
                          Update Price
                        </button>
                        <button
                          id={`view-history-btn-mobile-${item.id}`}
                          onClick={() => {
                            setHistoryItem(item);
                            setShowPriceHistoryModal(true);
                          }}
                          className="flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 active:scale-95 transition"
                        >
                          Price Log
                        </button>
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
                      <th className="px-5 py-3.5">Item Name</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Base Unit (Inventory)</th>
                      <th className="px-4 py-3.5">Selling Unit (Bill)</th>
                      <th className="px-4 py-3.5 text-right">Active Price</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredItems.map((item) => {
                      const latestPrice = item.prices?.[0]?.pricePerUnit ?? 0;
                      return (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition">
                          <td className="px-5 py-3.5 font-medium text-slate-100">
                            {item.name}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                              {item.category?.name || 'Uncategorized'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-400">
                            {item.baseUnit?.name} ({item.baseUnit?.symbol})
                          </td>
                          <td className="px-4 py-3.5 text-slate-400">
                            {item.sellingUnit?.name} ({item.sellingUnit?.symbol})
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-emerald-400">
                            ₹{latestPrice} / {item.sellingUnit?.symbol}
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-2">
                            <button
                              id={`set-price-btn-${item.id}`}
                              onClick={() => {
                                setSelectedItemForPrice(item);
                                setNewPrice(String(latestPrice));
                                setShowPriceModal(true);
                              }}
                              className="text-xs text-indigo-400 hover:text-indigo-300"
                            >
                              Update Price
                            </button>
                            <button
                              id={`view-history-btn-${item.id}`}
                              onClick={() => {
                                setHistoryItem(item);
                                setShowPriceHistoryModal(true);
                              }}
                              className="text-xs text-slate-400 hover:text-slate-200"
                            >
                              Price Log
                            </button>
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
      </div>

      {/* Modal: Create Category */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Add Product Category</h2>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Category Name
                </label>
                <input
                  id="category-name-input"
                  type="text"
                  required
                  placeholder="e.g. Dry Fruits, Savory Snacks"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  id="save-category-btn"
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Item */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Create New Item</h2>
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Item Name
                </label>
                <input
                  id="item-name-input"
                  type="text"
                  required
                  placeholder="e.g. Roasted Almonds 500g"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Category (optional)
                </label>
                <select
                  id="item-category-select"
                  value={itemCatId}
                  onChange={(e) => setItemCatId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Select category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Base Unit (Inventory)
                  </label>
                  <select
                    id="base-unit-select"
                    value={baseUnitId}
                    onChange={(e) => setBaseUnitId(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Selling Unit (Bills)
                  </label>
                  <select
                    id="selling-unit-select"
                    value={sellingUnitId}
                    onChange={(e) => setSellingUnitId(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Initial Selling Price (₹ per selling unit)
                </label>
                <input
                  id="initial-price-input"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={initialPrice}
                  onChange={(e) => setInitialPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  id="save-item-btn"
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Create Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Set Date-Effective Price */}
      {showPriceModal && selectedItemForPrice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Set Date-Effective Price</h2>
            <p className="text-xs text-slate-400 mb-4">
              Item: <span className="font-semibold text-slate-200">{selectedItemForPrice.name}</span>
            </p>
            <form onSubmit={handleSetPrice} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  New Price (₹ per {selectedItemForPrice.sellingUnit?.symbol})
                </label>
                <input
                  id="new-price-input"
                  type="number"
                  step="0.01"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Effective From Date &amp; Time
                </label>
                <input
                  id="effective-date-input"
                  type="datetime-local"
                  required
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  New row is inserted into ItemPrice ledger. Bills resolve price with latest effectiveDate ≤ billDate.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPriceModal(false)}
                  className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  id="submit-price-btn"
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Save Date-Effective Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Price History */}
      {showPriceHistoryModal && historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Price History Ledger</h2>
                <p className="text-xs text-slate-400">{historyItem.name}</p>
              </div>
              <button
                onClick={() => setShowPriceHistoryModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950 p-2">
              {historyItem.prices && historyItem.prices.length > 0 ? (
                historyItem.prices.map((p, idx) => (
                  <div key={p.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-200">
                        ₹{p.pricePerUnit} / {historyItem.sellingUnit?.symbol}
                        {idx === 0 && (
                          <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                            Active
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        Effective from: {new Date(p.effectiveDate).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="p-4 text-center text-xs text-slate-500">No prices recorded</p>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
