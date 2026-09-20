import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { Item, Shop } from '@/types/domain';

interface SelectedLineItem {
  itemId: string;
  quantity: number;
}

export default function CreateBillPage() {
  const navigate = useNavigate();
  const [shops, setShops] = useState<Shop[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [shopId, setShopId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [actualAmount, setActualAmount] = useState('');

  // Attachment photo state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string>('');

  // Mobile Category filter for line items
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Line Items
  const [lineItems, setLineItems] = useState<SelectedLineItem[]>([
    { itemId: '', quantity: 1 },
  ]);

  // Load active shops and items
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [shopList, itemList] = await Promise.all([
          api.get<Shop[]>('/shops'),
          api.get<Item[]>('/items'),
        ]);
        setShops(shopList || []);
        if (shopList && shopList.length > 0) {
          setShopId(shopList[0].id);
        }
        setItems(itemList?.filter((i) => i.isActive) || []);
        if (itemList && itemList.length > 0) {
          setLineItems([{ itemId: itemList[0].id, quantity: 1 }]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Update line item
  const updateLineItem = (index: number, field: 'itemId' | 'quantity', val: any) => {
    setLineItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const addLineItem = () => {
    if (items.length > 0) {
      setLineItems((prev) => [...prev, { itemId: items[0].id, quantity: 1 }]);
    }
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const calculatedItems = lineItems.map((li) => {
    const item = items.find((i) => i.id === li.itemId);
    const pricePerUnit = item?.prices?.[0]?.pricePerUnit ?? 0;
    const lineAmount = (Number(li.quantity) || 0) * pricePerUnit;
    return {
      item,
      quantity: Number(li.quantity) || 0,
      pricePerUnit,
      lineAmount,
    };
  });

  const calculatedTotal = calculatedItems.reduce((acc, ci) => acc + ci.lineAmount, 0);
  const numActualAmount = Number(actualAmount) || 0;
  const derivedDiscountAmount = calculatedTotal - numActualAmount;
  const derivedDiscountPercent =
    calculatedTotal > 0 ? (derivedDiscountAmount / calculatedTotal) * 100 : 0;

  // Handle Photo selection
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto-fill actual amount to calculated total on first click if empty
  const handleFocusActualAmount = () => {
    if (!actualAmount && calculatedTotal > 0) {
      setActualAmount(String(calculatedTotal));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return alert('Please select a shop');
    if (!billNumber || Number(billNumber) <= 0) return alert('Please enter a valid bill number');
    if (calculatedItems.length === 0 || !calculatedItems[0].item) {
      return alert('Please add at least one item');
    }
    if (actualAmount === '' || Number(actualAmount) < 0) {
      return alert('Please enter actual amount collected');
    }

    setSubmitting(true);
    try {
      const payload = {
        shopId,
        billNumber: Number(billNumber),
        billDate: new Date(billDate).toISOString(),
        paymentMethod,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        customerAddress: customerAddress || undefined,
        actualAmount: Number(actualAmount),
        items: lineItems.map((li) => ({
          itemId: li.itemId,
          quantity: Number(li.quantity),
        })),
        attachment: photoFileName
          ? {
              objectKey: `bills/${shopId}/${billNumber}_${Date.now()}.jpg`,
              mimeType: 'image/jpeg',
              sizeBytes: 154200,
              hash: `sha256_${Date.now()}`,
            }
          : undefined,
      };

      const bill = await api.post<any>('/bills', payload);
      alert(`Bill #${bill.billNumber} successfully created and submitted for review!`);
      navigate('/bills/my');
    } catch (err: any) {
      alert(err.message || 'Error creating bill');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Create Customer Bill
          </h1>
          <p className="text-sm text-slate-400">
            Enter physical bill details, attach a photo slip, and submit for ledger &amp; review.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading bill form...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shop & Bill Info Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4 shadow">
              <h2 className="text-sm font-semibold text-slate-200">Shop &amp; Invoice Info</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Shop / Branch
                  </label>
                  <select
                    id="shop-select"
                    value={shopId}
                    onChange={(e) => setShopId(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Physical Bill No.
                  </label>
                  <input
                    id="bill-number-input"
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 105"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Monitored against the shop's active bill pad sequence.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Bill Date &amp; Time
                  </label>
                  <input
                    id="bill-date-input"
                    type="datetime-local"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Customer Info & Payment */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Customer Name (optional)
                  </label>
                  <input
                    id="customer-name-input"
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Mobile Phone (optional)
                  </label>
                  <input
                    id="customer-phone-input"
                    type="tel"
                    placeholder="10-digit number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Address (optional)
                  </label>
                  <input
                    id="customer-address-input"
                    type="text"
                    placeholder="City / Area"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Payment Method
                  </label>
                  <select
                    id="payment-method-select"
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="CARD">Card / POS</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Line Items Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 space-y-4 shadow">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-200">Line Items</h2>
                  <p className="text-xs text-slate-400">
                    Quantities measured in selling unit; inventory is deducted automatically in base unit.
                  </p>
                </div>
                <button
                  id="add-line-item-btn"
                  type="button"
                  onClick={addLineItem}
                  className="flex min-h-[44px] items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-600/20 px-4 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-600 hover:text-white transition active:scale-95"
                >
                  + Add Another Item
                </button>
              </div>

              {/* Category Quick Filter Chips for Mobile Item Discovery */}
              {items.length > 0 && (
                <div className="flex overflow-x-auto pb-1 space-x-1.5 no-scrollbar">
                  {['ALL', ...Array.from(new Set(items.map((i) => i.category?.name).filter(Boolean)))].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat as string)}
                      className={`min-h-[36px] whitespace-nowrap rounded-lg px-3 py-1 text-xs font-medium transition ${
                        selectedCategory === cat
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {lineItems.map((li, index) => {
                  const calc = calculatedItems[index];
                  const selItem = calc?.item;
                  const filteredItems = selectedCategory === 'ALL'
                    ? items
                    : items.filter((it) => it.category?.name === selectedCategory || it.id === li.itemId);

                  const stepDown = () => {
                    const currentVal = Number(li.quantity) || 1;
                    if (currentVal > 1) {
                      updateLineItem(index, 'quantity', currentVal - 1);
                    }
                  };

                  const stepUp = () => {
                    const currentVal = Number(li.quantity) || 0;
                    updateLineItem(index, 'quantity', currentVal + 1);
                  };

                  return (
                    <div
                      key={index}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3.5 sm:flex-row sm:items-center sm:gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1 sm:hidden">
                          <label className="text-[11px] font-medium text-slate-400">
                            Select Item ({index + 1})
                          </label>
                          {lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLineItem(index)}
                              className="text-xs text-rose-400 font-medium px-1 py-0.5"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <select
                          id={`item-row-select-${index}`}
                          value={li.itemId}
                          onChange={(e) => updateLineItem(index, 'itemId', e.target.value)}
                          className="w-full min-h-[44px] rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                        >
                          {filteredItems.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name} — ₹{i.prices?.[0]?.pricePerUnit ?? 0} / {i.sellingUnit?.symbol}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity Stepper for Mobile Finger Tapping */}
                      <div className="w-full sm:w-48">
                        <label className="block text-[11px] font-medium text-slate-400 mb-1 sm:hidden">
                          Quantity ({selItem?.sellingUnit?.symbol || 'units'})
                        </label>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={stepDown}
                            aria-label="Decrease quantity"
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-lg font-bold text-slate-300 hover:bg-slate-800 active:bg-slate-700 transition"
                          >
                            −
                          </button>
                          <div className="relative flex-1">
                            <input
                              id={`quantity-input-${index}`}
                              type="number"
                              step="0.01"
                              min="0.01"
                              inputMode="decimal"
                              required
                              value={li.quantity}
                              onChange={(e) =>
                                updateLineItem(index, 'quantity', e.target.value)
                              }
                              className="w-full min-h-[44px] rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-center text-base font-semibold text-slate-100 focus:border-indigo-500 focus:outline-none"
                            />
                            <span className="absolute right-2 top-3 text-[10px] font-medium text-slate-500 pointer-events-none">
                              {selItem?.sellingUnit?.symbol}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={stepUp}
                            aria-label="Increase quantity"
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-lg font-bold text-slate-300 hover:bg-slate-800 active:bg-slate-700 transition"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Item Total */}
                      <div className="flex items-center justify-between sm:w-28 sm:flex-col sm:items-end sm:justify-center">
                        <span className="text-[11px] text-slate-400">
                          ₹{calc?.pricePerUnit ?? 0} × {calc?.quantity}
                        </span>
                        <span className="text-base font-bold text-white sm:text-sm">
                          ₹{calc?.lineAmount.toFixed(2)}
                        </span>
                      </div>

                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Photo Attachment & Summary Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Photo Slip Upload */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 space-y-4 shadow">
                <div>
                  <h2 className="text-sm font-semibold text-slate-200">
                    Physical Bill Attachment
                  </h2>
                  <p className="text-xs text-slate-400">
                    Snap a phone camera photo or upload receipt slip for audit. Immutable once submitted.
                  </p>
                </div>

                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-4 text-center">
                  {photoPreview ? (
                    <div className="space-y-3">
                      <img
                        src={photoPreview}
                        alt="Bill slip preview"
                        className="mx-auto max-h-48 rounded-xl object-contain border border-slate-800 shadow"
                      />
                      <p className="text-xs text-emerald-400 font-medium">✓ {photoFileName}</p>
                      <div className="flex items-center justify-center gap-2">
                        <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition">
                          Change photo
                          <input
                            id="bill-photo-file-input"
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoPreview(null);
                            setPhotoFileName('');
                          }}
                          className="min-h-[44px] rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 text-xl">
                        📸
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">Capture or Select Bill Slip</p>
                        <p className="text-xs text-slate-500">Supports direct mobile camera or photo library</p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                        <label className="flex w-full sm:w-auto min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-500 transition active:scale-95">
                          <span>📷 Use Phone Camera</span>
                          <input
                            id="bill-camera-input"
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                        <label className="flex w-full sm:w-auto min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition">
                          <span>Choose from Gallery</span>
                          <input
                            id="bill-photo-file-input"
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount & Discount Summary */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 space-y-4 shadow flex flex-col justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-200 mb-3">
                    Settlement &amp; Derived Discount
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-sm">
                      <span className="text-slate-400">System Calculated Total</span>
                      <span className="text-lg font-bold text-slate-100">
                        ₹{calculatedTotal.toFixed(2)}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-slate-300">
                          Actual Amount Collected (₹) *
                        </label>
                        <button
                          type="button"
                          onClick={() => setActualAmount(String(calculatedTotal))}
                          className="min-h-[32px] px-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                        >
                          Match Total
                        </button>
                      </div>
                      <input
                        id="actual-amount-input"
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        required
                        placeholder="Amount received from customer"
                        value={actualAmount}
                        onFocus={handleFocusActualAmount}
                        onChange={(e) => setActualAmount(e.target.value)}
                        className="w-full min-h-[48px] rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-lg font-bold text-emerald-400 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="rounded-xl bg-slate-950 p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Derived Discount (Amount):</span>
                        <span
                          className={`font-bold ${
                            derivedDiscountAmount > 0
                              ? 'text-amber-400'
                              : derivedDiscountAmount < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          ₹{derivedDiscountAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Derived Discount (%):</span>
                        <span
                          className={`font-bold ${
                            derivedDiscountPercent > 0 ? 'text-amber-400' : 'text-slate-400'
                          }`}
                        >
                          {derivedDiscountPercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    id="submit-bill-btn"
                    type="submit"
                    disabled={submitting}
                    className="w-full min-h-[48px] rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-500 disabled:opacity-50 transition active:scale-98"
                  >
                    {submitting ? 'Submitting & Posting Ledger...' : 'Submit Bill for Review'}
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile-Only Sticky Bottom Action Bar for Quick Checkout */}
            <div className="fixed bottom-14 inset-x-0 z-30 flex md:hidden items-center justify-between border-t border-slate-800/95 bg-slate-900/95 backdrop-blur-lg px-4 py-2.5 shadow-2xl">
              <div>
                <p className="text-[10px] text-slate-400">
                  {lineItems.length} {lineItems.length === 1 ? 'item' : 'items'}
                </p>
                <p className="text-base font-extrabold text-emerald-400">
                  ₹{(Number(actualAmount) || calculatedTotal).toFixed(2)}
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex min-h-[44px] items-center justify-center rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md active:scale-95 disabled:opacity-50 transition"
              >
                {submitting ? 'Submitting…' : 'Submit Bill →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
