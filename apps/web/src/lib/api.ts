/**
 * Client for talking to the NestJS API.
 * In development / preview when the backend API server is offline,
 * falls back to the local database store for an instant, fully-functional experience.
 */
import { mockStore } from './mock-store';
import {
  Bill,
  BillItem,
  BillModificationRequest,
  BillPad,
  BillReview,
  BillVersion,
  Category,
  InventoryTransaction,
  Item,
  Unit,
  UnitConversion,
} from '../types/domain';

const API_BASE = '/api';

function getToken(): string | null {
  return sessionStorage.getItem('accessToken');
}

export function setToken(token: string | null) {
  if (token) sessionStorage.setItem('accessToken', token);
  else sessionStorage.removeItem('accessToken');
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Handler for local database simulation when backend is unreachable
function handleMockFallback<T>(path: string, options: RequestInit = {}): T {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body as string) : {};
  const [pathname, search] = path.split('?');
  const params = new URLSearchParams(search || '');

  // Auth mock
  if (pathname === '/auth/login' && method === 'POST') {
    const { mobileNumber } = body;
    let role = 'ADMIN';
    let fullName = 'Admin User';
    if (mobileNumber === '9999900002') {
      role = 'MANAGER';
      fullName = 'Sanjay Gupta (Manager)';
    } else if (mobileNumber === '9999900003') {
      role = 'EMPLOYEE';
      fullName = 'Rahul Sharma (Cashier)';
    } else if (mobileNumber && mobileNumber.endsWith('2')) {
      role = 'MANAGER';
      fullName = 'Demo Manager';
    } else if (mobileNumber && mobileNumber.endsWith('3')) {
      role = 'EMPLOYEE';
      fullName = 'Demo Employee';
    }
    return {
      accessToken: 'mock-jwt-token-' + Date.now(),
      user: {
        id: 'usr_' + (mobileNumber || 'admin'),
        fullName,
        mobileNumber: mobileNumber || '9999900001',
        role,
      },
    } as T;
  }

  if (pathname === '/auth/logout') {
    return { success: true } as T;
  }

  // Dashboard reports
  if (pathname === '/reports/dashboard/admin-manager') {
    return mockStore.getAdminDashboard() as unknown as T;
  }
  if (pathname === '/reports/dashboard/employee') {
    return mockStore.getEmployeeDashboard('usr_emp1') as unknown as T;
  }

  // Shops
  if (pathname === '/shops') {
    return mockStore.shops as unknown as T;
  }

  // Categories
  if (pathname === '/items/categories') {
    if (method === 'POST') {
      const cat: Category = { id: `cat_${Date.now()}`, name: body.name };
      mockStore.categories.push(cat);
      mockStore.saveAll();
      return cat as unknown as T;
    }
    return mockStore.categories as unknown as T;
  }

  // Units
  if (pathname === '/items/units') {
    if (method === 'POST') {
      const unt: Unit = {
        id: `unt_${Date.now()}`,
        name: body.name,
        symbol: body.symbol,
        type: body.type,
        toCanonicalFactor: Number(body.toCanonicalFactor),
      };
      mockStore.units.push(unt);
      mockStore.saveAll();
      return unt as unknown as T;
    }
    return mockStore.units as unknown as T;
  }

  // Unit conversions
  if (pathname === '/items/conversions' && method === 'POST') {
    const conv: UnitConversion = {
      id: `uc_${Date.now()}`,
      fromUnitId: body.fromUnitId,
      toUnitId: body.toUnitId,
      factor: Number(body.factor),
    };
    mockStore.conversions.push(conv);
    mockStore.saveAll();
    return conv as unknown as T;
  }

  // Items
  if (pathname === '/items') {
    if (method === 'POST') {
      const baseUnit = mockStore.units.find((u) => u.id === body.baseUnitId) || mockStore.units[0];
      const sellingUnit = mockStore.units.find((u) => u.id === body.sellingUnitId) || mockStore.units[0];
      const cat = mockStore.categories.find((c) => c.id === body.categoryId);

      const newItem: Item = {
        id: `itm_${Date.now()}`,
        name: body.name,
        categoryId: body.categoryId,
        category: cat,
        baseUnitId: body.baseUnitId,
        baseUnit,
        sellingUnitId: body.sellingUnitId,
        sellingUnit,
        isActive: true,
        prices: [
          {
            id: `prc_${Date.now()}`,
            itemId: `itm_${Date.now()}`,
            pricePerUnit: Number(body.initialPrice),
            effectiveDate: new Date().toISOString(),
          },
        ],
      };
      mockStore.items.push(newItem);
      mockStore.saveAll();
      return newItem as unknown as T;
    }
    return mockStore.items as unknown as T;
  }

  // Date-effective price set
  if (pathname.startsWith('/items/') && pathname.endsWith('/prices') && method === 'POST') {
    const itemId = pathname.split('/')[2];
    const item = mockStore.items.find((i) => i.id === itemId);
    if (item) {
      if (!item.prices) item.prices = [];
      const newPrice = {
        id: `prc_${Date.now()}`,
        itemId,
        pricePerUnit: Number(body.pricePerUnit),
        effectiveDate: new Date(body.effectiveDate).toISOString(),
        createdAt: new Date().toISOString(),
      };
      item.prices.unshift(newPrice);
      mockStore.saveAll();
      return newPrice as unknown as T;
    }
  }

  // Single Item
  if (pathname.startsWith('/items/') && !pathname.includes('/prices') && !pathname.includes('/categories')) {
    const id = pathname.replace('/items/', '');
    const item = mockStore.items.find((i) => i.id === id);
    if (method === 'PATCH' && item) {
      if (body.name !== undefined) item.name = body.name;
      if (body.isActive !== undefined) item.isActive = body.isActive;
      if (body.categoryId !== undefined) item.categoryId = body.categoryId;
      mockStore.saveAll();
      return item as unknown as T;
    }
    return item as unknown as T;
  }

  // Bills
  if (pathname === '/bills') {
    if (method === 'POST') {
      const pad = mockStore.getActivePadForShop(body.shopId);
      const billDate = body.billDate ? new Date(body.billDate).toISOString() : new Date().toISOString();

      let calculatedAmount = 0;
      const billItems: BillItem[] = [];

      for (const input of body.items) {
        const item = mockStore.items.find((i) => i.id === input.itemId);
        if (!item) continue;
        const pricePerUnit = mockStore.getItemPriceAtDate(item.id, new Date(billDate));
        const lineAmount = Number(input.quantity) * pricePerUnit;
        calculatedAmount += lineAmount;

        const baseQuantity = mockStore.calculateBaseQuantity(item, Number(input.quantity));

        billItems.push({
          id: `bi_${Date.now()}_${Math.random()}`,
          itemId: item.id,
          item,
          quantity: Number(input.quantity),
          unitLabel: item.sellingUnit?.symbol || item.sellingUnit?.name || 'unit',
          pricePerUnit,
          lineAmount,
          baseQuantity,
        });

        // Inventory deduction
        mockStore.transactions.unshift({
          id: `tx_${Date.now()}_${Math.random()}`,
          shopId: body.shopId,
          itemId: item.id,
          type: 'BILL_SALE',
          quantityChange: -baseQuantity,
          note: `Bill #${body.billNumber} sale`,
          performedById: 'usr_emp1',
          createdAt: new Date().toISOString(),
        });
      }

      const actualAmount = Number(body.actualAmount);
      const discountAmount = calculatedAmount - actualAmount;
      const discountPercent = calculatedAmount > 0 ? (discountAmount / calculatedAmount) * 100 : 0;

      const newBill: Bill = {
        id: `bil_${Date.now()}`,
        shopId: body.shopId,
        shop: mockStore.shops.find((s) => s.id === body.shopId),
        createdById: 'usr_emp1',
        createdBy: { id: 'usr_emp1', fullName: 'Rahul Sharma (Cashier)', mobileNumber: '9999900003', role: 'EMPLOYEE' },
        billNumber: Number(body.billNumber),
        billPadId: pad.id,
        billDate,
        status: 'SUBMITTED',
        paymentMethod: body.paymentMethod || 'CASH',
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerAddress: body.customerAddress,
        calculatedAmount,
        actualAmount,
        discountAmount,
        discountPercent,
        currentVersionNo: 1,
        items: billItems,
        attachment: body.attachment
          ? {
              id: `att_${Date.now()}`,
              objectKey: body.attachment.objectKey,
              mimeType: body.attachment.mimeType,
              sizeBytes: body.attachment.sizeBytes,
              hash: body.attachment.hash,
              uploadedAt: new Date().toISOString(),
            }
          : undefined,
        versions: [
          {
            id: `bv_${Date.now()}`,
            billId: `bil_${Date.now()}`,
            versionNumber: 1,
            authoredById: 'usr_emp1',
            reason: 'Initial bill creation',
            billDate,
            paymentMethod: body.paymentMethod || 'CASH',
            customerName: body.customerName,
            customerPhone: body.customerPhone,
            customerAddress: body.customerAddress,
            calculatedAmount,
            actualAmount,
            discountAmount,
            createdAt: new Date().toISOString(),
            items: billItems.map((bi) => ({
              id: `bvi_${Math.random()}`,
              billVersionId: `bv_${Date.now()}`,
              itemId: bi.itemId,
              item: bi.item,
              quantity: bi.quantity,
              unitLabel: bi.unitLabel,
              pricePerUnit: bi.pricePerUnit,
              lineAmount: bi.lineAmount,
              baseQuantity: bi.baseQuantity,
            })),
          },
        ],
        createdAt: new Date().toISOString(),
      };

      mockStore.bills.unshift(newBill);

      // Sequence check
      mockStore.checkSequence(body.shopId, newBill.id, newBill.billNumber);

      // Notification
      mockStore.notifications.unshift({
        id: `notif_${Date.now()}`,
        userId: 'all',
        type: 'PENDING_BILL_REVIEW',
        title: 'New Bill Pending Review',
        message: `Bill #${newBill.billNumber} was submitted for review. Total: ₹${actualAmount}`,
        status: 'UNREAD',
        entityType: 'Bill',
        entityId: newBill.id,
        createdAt: new Date().toISOString(),
      });

      mockStore.saveAll();
      return newBill as unknown as T;
    }

    const shopId = params.get('shopId');
    const status = params.get('status');
    let filtered = mockStore.bills;
    if (shopId) filtered = filtered.filter((b) => b.shopId === shopId);
    if (status) filtered = filtered.filter((b) => b.status === status);
    return filtered as unknown as T;
  }

  if (pathname === '/bills/submitted-queue') {
    const shopId = params.get('shopId');
    let queue = mockStore.bills.filter(
      (b) => b.status === 'SUBMITTED' || b.status === 'UNDER_REVIEW',
    );
    if (shopId) queue = queue.filter((b) => b.shopId === shopId);
    return queue as unknown as T;
  }

  if (pathname === '/bills/my') {
    return mockStore.bills.filter((b) => b.createdById === 'usr_emp1') as unknown as T;
  }

  // Single bill & Review & Modification
  if (pathname.startsWith('/bills/')) {
    const parts = pathname.split('/');
    const billId = parts[2];

    if (parts[3] === 'review' && method === 'POST') {
      const bill = mockStore.bills.find((b) => b.id === billId);
      if (bill) {
        bill.status = body.decision === 'APPROVED' ? 'APPROVED' : 'DISPUTED';
        const review: BillReview = {
          id: `rev_${Date.now()}`,
          billId,
          reviewerId: 'usr_mgr1',
          reviewer: { id: 'usr_mgr1', fullName: 'Manager User', role: 'MANAGER' },
          decision: body.decision,
          reason: body.reason,
          createdAt: new Date().toISOString(),
        };
        if (!bill.reviews) bill.reviews = [];
        bill.reviews.unshift(review);

        if (body.decision === 'DISPUTED') {
          mockStore.notifications.unshift({
            id: `notif_${Date.now()}`,
            userId: bill.createdById,
            type: 'BILL_DISPUTED',
            title: 'Bill Disputed',
            message: `Bill #${bill.billNumber} was disputed: ${body.reason || 'Correction required'}`,
            status: 'UNREAD',
            entityType: 'Bill',
            entityId: bill.id,
            createdAt: new Date().toISOString(),
          });
        }
        mockStore.saveAll();
        return bill as unknown as T;
      }
    }

    if (parts[3] === 'modification-requests' && method === 'POST') {
      const bill = mockStore.bills.find((b) => b.id === billId);
      if (bill) {
        const req: BillModificationRequest = {
          id: `mod_${Date.now()}`,
          billId,
          requestedById: 'usr_emp1',
          requestedBy: { id: 'usr_emp1', fullName: 'Rahul Sharma', role: 'EMPLOYEE' },
          reason: body.reason,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        };
        if (!bill.modificationRequests) bill.modificationRequests = [];
        bill.modificationRequests.unshift(req);
        mockStore.notifications.unshift({
          id: `notif_${Date.now()}`,
          userId: 'all',
          type: 'MODIFICATION_REQUESTED',
          title: 'Modification Requested',
          message: `Bill #${bill.billNumber}: ${body.reason}`,
          status: 'UNREAD',
          entityType: 'BillModificationRequest',
          entityId: req.id,
          createdAt: new Date().toISOString(),
        });
        mockStore.saveAll();
        return req as unknown as T;
      }
    }

    if (pathname.includes('/modification-requests/') && pathname.endsWith('/resolve') && method === 'PATCH') {
      const requestId = parts[3];
      for (const bill of mockStore.bills) {
        const req = bill.modificationRequests?.find((r) => r.id === requestId);
        if (req) {
          req.status = body.status;
          req.resolvedById = 'usr_mgr1';
          req.resolvedBy = { id: 'usr_mgr1', fullName: 'Manager User' };
          req.resolvedAt = new Date().toISOString();

          if (body.status === 'RESOLVED') {
            const nextVersionNo = bill.currentVersionNo + 1;
            req.resultingVersionNo = nextVersionNo;

            // Revised items
            let calculatedTotal = 0;
            const newItems: BillItem[] = [];

            const sourceItems = body.revisedItems || bill.items;
            for (const itemInput of sourceItems) {
              const itm = mockStore.items.find((i) => i.id === itemInput.itemId);
              if (!itm) continue;
              const pricePerUnit = mockStore.getItemPriceAtDate(itm.id, new Date(bill.billDate));
              const lineAmount = Number(itemInput.quantity) * pricePerUnit;
              calculatedTotal += lineAmount;
              const baseQuantity = mockStore.calculateBaseQuantity(itm, Number(itemInput.quantity));

              newItems.push({
                id: `bi_${Date.now()}_${Math.random()}`,
                itemId: itm.id,
                item: itm,
                quantity: Number(itemInput.quantity),
                unitLabel: itm.sellingUnit?.symbol || itm.sellingUnit?.name || 'unit',
                pricePerUnit,
                lineAmount,
                baseQuantity,
              });

              // Reconcile delta with previous version
              const oldItem = bill.items.find((oi) => oi.itemId === itm.id);
              const oldBase = oldItem?.baseQuantity ?? 0;
              const delta = baseQuantity - oldBase;
              if (delta !== 0) {
                mockStore.transactions.unshift({
                  id: `tx_${Date.now()}_${Math.random()}`,
                  shopId: bill.shopId,
                  itemId: itm.id,
                  type: 'BILL_CORRECTION',
                  quantityChange: -delta,
                  note: `Bill #${bill.billNumber} correction v${nextVersionNo}`,
                  performedById: 'usr_mgr1',
                  createdAt: new Date().toISOString(),
                });
              }
            }

            const revisedActual = body.revisedActualAmount !== undefined ? Number(body.revisedActualAmount) : bill.actualAmount;
            const discountAmount = calculatedTotal - revisedActual;
            const discountPercent = calculatedTotal > 0 ? (discountAmount / calculatedTotal) * 100 : 0;

            const newVersion: BillVersion = {
              id: `bv_${Date.now()}`,
              billId: bill.id,
              versionNumber: nextVersionNo,
              authoredById: 'usr_mgr1',
              authoredBy: { id: 'usr_mgr1', fullName: 'Manager User' },
              reason: body.resolutionReason || 'Modification accepted',
              billDate: bill.billDate,
              paymentMethod: bill.paymentMethod,
              customerName: bill.customerName,
              customerPhone: bill.customerPhone,
              customerAddress: bill.customerAddress,
              calculatedAmount: calculatedTotal,
              actualAmount: revisedActual,
              discountAmount,
              createdAt: new Date().toISOString(),
              items: newItems.map((ni) => ({
                id: `bvi_${Math.random()}`,
                billVersionId: `bv_${Date.now()}`,
                itemId: ni.itemId,
                item: ni.item,
                quantity: ni.quantity,
                unitLabel: ni.unitLabel,
                pricePerUnit: ni.pricePerUnit,
                lineAmount: ni.lineAmount,
                baseQuantity: ni.baseQuantity,
              })),
            };

            if (!bill.versions) bill.versions = [];
            bill.versions.unshift(newVersion);
            bill.currentVersionNo = nextVersionNo;
            bill.calculatedAmount = calculatedTotal;
            bill.actualAmount = revisedActual;
            bill.discountAmount = discountAmount;
            bill.discountPercent = discountPercent;
            bill.items = newItems;
            bill.status = 'UNDER_REVIEW';
          }

          mockStore.saveAll();
          return bill as unknown as T;
        }
      }
    }

    const singleBill = mockStore.bills.find((b) => b.id === billId);
    return singleBill as unknown as T;
  }

  // Inventory
  if (pathname === '/inventory/stock') {
    const shopId = params.get('shopId') || undefined;
    const itemId = params.get('itemId') || undefined;
    return mockStore.getDerivedStock(shopId, itemId) as unknown as T;
  }

  if (pathname === '/inventory/receive' && method === 'POST') {
    const item = mockStore.items.find((i) => i.id === body.itemId);
    const txn: InventoryTransaction = {
      id: `tx_${Date.now()}`,
      shopId: body.shopId,
      shop: mockStore.shops.find((s) => s.id === body.shopId),
      itemId: body.itemId,
      item,
      type: 'RECEIVE',
      quantityChange: Number(body.quantity),
      note: body.note || `Received ${body.quantity} ${item?.baseUnit?.symbol || ''}`,
      performedById: 'usr_admin',
      performedBy: { id: 'usr_admin', fullName: 'Admin User', role: 'ADMIN' },
      createdAt: new Date().toISOString(),
    };
    mockStore.transactions.unshift(txn);
    mockStore.saveAll();
    return txn as unknown as T;
  }

  if (pathname === '/inventory/transfer' && method === 'POST') {
    const item = mockStore.items.find((i) => i.id === body.itemId);
    const toShop = mockStore.shops.find((s) => s.id === body.toShopId);
    const fromShop = mockStore.shops.find((s) => s.id === body.fromShopId);
    const qty = Number(body.quantity);

    mockStore.transactions.unshift({
      id: `tx_out_${Date.now()}`,
      shopId: body.fromShopId,
      shop: fromShop,
      itemId: body.itemId,
      item,
      type: 'TRANSFER_OUT',
      quantityChange: -qty,
      note: `Transfer to ${toShop?.name || 'Other shop'}: ${body.reason || ''}`,
      performedById: 'usr_admin',
      performedBy: { id: 'usr_admin', fullName: 'Admin User', role: 'ADMIN' },
      createdAt: new Date().toISOString(),
    });

    mockStore.transactions.unshift({
      id: `tx_in_${Date.now()}`,
      shopId: body.toShopId,
      shop: toShop,
      itemId: body.itemId,
      item,
      type: 'TRANSFER_IN',
      quantityChange: qty,
      note: `Transfer from ${fromShop?.name || 'Other shop'}: ${body.reason || ''}`,
      performedById: 'usr_admin',
      performedBy: { id: 'usr_admin', fullName: 'Admin User', role: 'ADMIN' },
      createdAt: new Date().toISOString(),
    });

    mockStore.saveAll();
    return { success: true } as unknown as T;
  }

  if (pathname === '/inventory/adjustment' && method === 'POST') {
    const item = mockStore.items.find((i) => i.id === body.itemId);
    const currentStock = mockStore.transactions
      .filter((t) => t.shopId === body.shopId && t.itemId === body.itemId)
      .reduce((sum, t) => sum + Number(t.quantityChange), 0);

    const physicalStock = Number(body.physicalStock);
    const delta = physicalStock - currentStock;

    const txn: InventoryTransaction = {
      id: `tx_adj_${Date.now()}`,
      shopId: body.shopId,
      shop: mockStore.shops.find((s) => s.id === body.shopId),
      itemId: body.itemId,
      item,
      type: 'ADJUSTMENT',
      quantityChange: delta,
      note: `Stock count adjustment: ${body.reason} (System: ${currentStock}, Count: ${physicalStock})`,
      performedById: 'usr_admin',
      performedBy: { id: 'usr_admin', fullName: 'Admin User', role: 'ADMIN' },
      createdAt: new Date().toISOString(),
    };
    mockStore.transactions.unshift(txn);
    mockStore.saveAll();
    return txn as unknown as T;
  }

  if (pathname === '/inventory/transactions') {
    return mockStore.transactions as unknown as T;
  }

  // Bill Sequence
  if (pathname === '/bill-sequence/events') {
    return mockStore.sequenceEvents as unknown as T;
  }

  if (pathname.startsWith('/bill-sequence/events/') && pathname.endsWith('/resolve') && method === 'PATCH') {
    const id = pathname.split('/')[3];
    const event = mockStore.sequenceEvents.find((e) => e.id === id);
    if (event) {
      event.status = body.status;
      event.details += ` | Resolution: ${body.resolutionNotes}`;
      event.resolvedAt = new Date().toISOString();
      event.resolvedBy = { id: 'usr_mgr1', fullName: 'Manager User' };

      if (body.openNewPad) {
        const pad = mockStore.pads.find((p) => p.id === event.billPadId);
        if (pad) {
          pad.closedAt = new Date().toISOString();
          const newPad: BillPad = {
            id: `pad_${Date.now()}`,
            shopId: pad.shopId,
            label: body.newPadLabel || `New Pad (${new Date().toLocaleDateString()})`,
            startedAt: new Date().toISOString(),
            closedAt: null,
          };
          mockStore.pads.push(newPad);
        }
      }
      mockStore.saveAll();
      return event as unknown as T;
    }
  }

  if (pathname.startsWith('/bill-sequence/active-pad/')) {
    const shopId = pathname.replace('/bill-sequence/active-pad/', '');
    return mockStore.getActivePadForShop(shopId) as unknown as T;
  }

  // Notifications
  if (pathname === '/notifications') {
    return mockStore.notifications as unknown as T;
  }

  if (pathname === '/notifications/unread-count') {
    const count = mockStore.notifications.filter((n) => n.status === 'UNREAD').length;
    return count as unknown as T;
  }

  if (pathname.startsWith('/notifications/') && pathname.endsWith('/read') && method === 'PATCH') {
    const id = pathname.split('/')[2];
    const notif = mockStore.notifications.find((n) => n.id === id);
    if (notif) {
      notif.status = 'READ';
      notif.readAt = new Date().toISOString();
      mockStore.saveAll();
      return notif as unknown as T;
    }
  }

  if (pathname === '/notifications/read-all' && method === 'POST') {
    for (const n of mockStore.notifications) {
      n.status = 'READ';
      n.readAt = new Date().toISOString();
    }
    mockStore.saveAll();
    return { success: true } as unknown as T;
  }

  return undefined as unknown as T;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    ...(options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    // In SPA environments (Vite dev server or static build without backend reverse proxy),
    // unmatched /api routes return 200 index.html with <!doctype html>.
    // Detect HTML responses and immediately fall back to local store.
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return handleMockFallback<T>(path, options);
    }

    if (!res.ok) {
      // If server returned 404 or 502 (e.g. backend route not mounted or offline), fallback to mockStore
      if (res.status === 404 || res.status === 502 || res.status === 503) {
        return handleMockFallback<T>(path, options);
      }
      let message = res.statusText;
      try {
        const body = await res.json();
        message = body.message ?? message;
      } catch {
        /* ignore parse failure */
      }
      throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message);
    }

    if (res.status === 204) return undefined as T;

    const rawText = await res.text();
    if (!rawText || rawText.trim().startsWith('<')) {
      return handleMockFallback<T>(path, options);
    }

    try {
      return JSON.parse(rawText) as T;
    } catch {
      return handleMockFallback<T>(path, options);
    }
  } catch (err) {
    // If network error, parse error, or unmapped backend
    if (
      err instanceof TypeError ||
      err instanceof SyntaxError ||
      (err instanceof ApiError && (err.status === 404 || err.status >= 500))
    ) {
      return handleMockFallback<T>(path, options);
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
