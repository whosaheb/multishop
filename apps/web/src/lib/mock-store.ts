import {
  AdminDashboardData,
  Bill,
  BillPad,
  BillSequenceEvent,
  Category,
  DerivedStock,
  EmployeeDashboardData,
  InventoryTransaction,
  Item,
  NotificationItem,
  Shop,
  Unit,
  UnitConversion,
} from '../types/domain';

// Local storage keys
const STORAGE_PREFIX = 'multishop_';

function load<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function save<T>(key: string, val: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
  } catch {
    /* ignore storage quota errors */
  }
}

// Initial Seed Data
const initialShops: Shop[] = [
  { id: 'shp_1', name: 'Downtown Sweets & Dairy', code: 'DT-01', status: 'ACTIVE', address: '12 MG Road, Downtown' },
  { id: 'shp_2', name: 'Westside Super Outlet', code: 'WS-02', status: 'ACTIVE', address: '44 Ring Road, Westside' },
  { id: 'shp_3', name: 'Highway Express Hub', code: 'HW-03', status: 'ACTIVE', address: 'Plot 7, National Highway 48' },
];

const initialUnits: Unit[] = [
  { id: 'unt_kg', name: 'Kilogram', symbol: 'kg', type: 'WEIGHT', toCanonicalFactor: 1000 },
  { id: 'unt_g', name: 'Gram', symbol: 'g', type: 'WEIGHT', toCanonicalFactor: 1 },
  { id: 'unt_l', name: 'Litre', symbol: 'l', type: 'VOLUME', toCanonicalFactor: 1000 },
  { id: 'unt_ml', name: 'Millilitre', symbol: 'ml', type: 'VOLUME', toCanonicalFactor: 1 },
  { id: 'unt_pc', name: 'Piece', symbol: 'pc', type: 'COUNT', toCanonicalFactor: 1 },
  { id: 'unt_box', name: 'Box (12 pcs)', symbol: 'box', type: 'COUNT', toCanonicalFactor: 12 },
];

const initialConversions: UnitConversion[] = [
  { id: 'uc_1', fromUnitId: 'unt_kg', toUnitId: 'unt_g', factor: 1000 },
  { id: 'uc_2', fromUnitId: 'unt_l', toUnitId: 'unt_ml', factor: 1000 },
  { id: 'uc_3', fromUnitId: 'unt_box', toUnitId: 'unt_pc', factor: 12 },
];

const initialCategories: Category[] = [
  { id: 'cat_sweets', name: 'Traditional Sweets' },
  { id: 'cat_dairy', name: 'Fresh Dairy' },
  { id: 'cat_savory', name: 'Namkeen & Savory' },
  { id: 'cat_bakery', name: 'Bakery & Biscuits' },
];

const initialItems: Item[] = [
  {
    id: 'itm_laddu',
    name: 'Motichoor Laddu Special',
    categoryId: 'cat_sweets',
    baseUnitId: 'unt_g',
    baseUnit: initialUnits[1], // g
    sellingUnitId: 'unt_kg',
    sellingUnit: initialUnits[0], // kg
    isActive: true,
    prices: [
      { id: 'prc_1', itemId: 'itm_laddu', pricePerUnit: 440, effectiveDate: '2026-01-01T00:00:00.000Z' },
    ],
  },
  {
    id: 'itm_kaju',
    name: 'Kaju Katli Diamond Cut',
    categoryId: 'cat_sweets',
    baseUnitId: 'unt_g',
    baseUnit: initialUnits[1],
    sellingUnitId: 'unt_kg',
    sellingUnit: initialUnits[0],
    isActive: true,
    prices: [
      { id: 'prc_2', itemId: 'itm_kaju', pricePerUnit: 980, effectiveDate: '2026-01-01T00:00:00.000Z' },
    ],
  },
  {
    id: 'itm_ghee',
    name: 'Pure Desi Cow Ghee',
    categoryId: 'cat_dairy',
    baseUnitId: 'unt_ml',
    baseUnit: initialUnits[3], // ml
    sellingUnitId: 'unt_l',
    sellingUnit: initialUnits[2], // l
    isActive: true,
    prices: [
      { id: 'prc_3', itemId: 'itm_ghee', pricePerUnit: 680, effectiveDate: '2026-01-01T00:00:00.000Z' },
    ],
  },
  {
    id: 'itm_gulab',
    name: 'Gulab Jamun Gift Box',
    categoryId: 'cat_sweets',
    baseUnitId: 'unt_pc',
    baseUnit: initialUnits[4],
    sellingUnitId: 'unt_box',
    sellingUnit: initialUnits[5],
    isActive: true,
    prices: [
      { id: 'prc_4', itemId: 'itm_gulab', pricePerUnit: 260, effectiveDate: '2026-01-01T00:00:00.000Z' },
    ],
  },
  {
    id: 'itm_mixture',
    name: 'Special Royal Mixture',
    categoryId: 'cat_savory',
    baseUnitId: 'unt_g',
    baseUnit: initialUnits[1],
    sellingUnitId: 'unt_kg',
    sellingUnit: initialUnits[0],
    isActive: true,
    prices: [
      { id: 'prc_5', itemId: 'itm_mixture', pricePerUnit: 340, effectiveDate: '2026-01-01T00:00:00.000Z' },
    ],
  },
];

const initialPads: BillPad[] = [
  { id: 'pad_shp1_1', shopId: 'shp_1', label: 'Downtown Pad 2026-A', startedAt: '2026-09-01T00:00:00.000Z', closedAt: null },
  { id: 'pad_shp2_1', shopId: 'shp_2', label: 'Westside Pad 2026-A', startedAt: '2026-09-01T00:00:00.000Z', closedAt: null },
  { id: 'pad_shp3_1', shopId: 'shp_3', label: 'Highway Pad 2026-A', startedAt: '2026-09-01T00:00:00.000Z', closedAt: null },
];

const initialTransactions: InventoryTransaction[] = [
  {
    id: 'tx_init_1',
    shopId: 'shp_1',
    itemId: 'itm_laddu',
    type: 'RECEIVE',
    quantityChange: 50000, // 50,000 g = 50 kg
    note: 'Initial morning batch delivery',
    performedById: 'usr_admin',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'tx_init_2',
    shopId: 'shp_1',
    itemId: 'itm_kaju',
    type: 'RECEIVE',
    quantityChange: 35000, // 35 kg
    note: 'Initial batch',
    performedById: 'usr_admin',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'tx_init_3',
    shopId: 'shp_1',
    itemId: 'itm_ghee',
    type: 'RECEIVE',
    quantityChange: 40000, // 40,000 ml = 40 L
    note: 'Dairy supply received',
    performedById: 'usr_admin',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'tx_init_4',
    shopId: 'shp_2',
    itemId: 'itm_laddu',
    type: 'RECEIVE',
    quantityChange: 30000,
    note: 'Outlet stock',
    performedById: 'usr_admin',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'tx_init_5',
    shopId: 'shp_2',
    itemId: 'itm_mixture',
    type: 'RECEIVE',
    quantityChange: 45000,
    note: 'Savory stock',
    performedById: 'usr_admin',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

const initialBills: Bill[] = [
  {
    id: 'bil_seed_1',
    shopId: 'shp_1',
    createdById: 'usr_emp1',
    createdBy: { id: 'usr_emp1', fullName: 'Rahul Sharma (Cashier)', mobileNumber: '9999900003', role: 'EMPLOYEE' },
    billNumber: 101,
    billPadId: 'pad_shp1_1',
    billDate: new Date().toISOString(),
    status: 'SUBMITTED',
    paymentMethod: 'UPI',
    customerName: 'Aarav Patel',
    customerPhone: '9876543210',
    calculatedAmount: 880,
    actualAmount: 850,
    discountAmount: 30,
    discountPercent: 3.41,
    currentVersionNo: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    attachment: {
      id: 'att_1',
      objectKey: 'bills/2026/09/bill_101.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 184520,
      hash: 'sha256_mock_hash_101',
      uploadedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    items: [
      {
        id: 'bi_1',
        itemId: 'itm_laddu',
        quantity: 2, // 2 kg
        unitLabel: 'kg',
        pricePerUnit: 440,
        lineAmount: 880,
        baseQuantity: 2000, // 2000 g
      },
    ],
    versions: [
      {
        id: 'bv_1',
        billId: 'bil_seed_1',
        versionNumber: 1,
        authoredById: 'usr_emp1',
        reason: 'Initial bill creation',
        billDate: new Date().toISOString(),
        paymentMethod: 'UPI',
        customerName: 'Aarav Patel',
        customerPhone: '9876543210',
        calculatedAmount: 880,
        actualAmount: 850,
        discountAmount: 30,
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        items: [
          {
            id: 'bvi_1',
            billVersionId: 'bv_1',
            itemId: 'itm_laddu',
            quantity: 2,
            unitLabel: 'kg',
            pricePerUnit: 440,
            lineAmount: 880,
            baseQuantity: 2000,
          },
        ],
      },
    ],
  },
  {
    id: 'bil_seed_2',
    shopId: 'shp_1',
    createdById: 'usr_emp1',
    createdBy: { id: 'usr_emp1', fullName: 'Rahul Sharma (Cashier)', mobileNumber: '9999900003', role: 'EMPLOYEE' },
    billNumber: 102,
    billPadId: 'pad_shp1_1',
    billDate: new Date().toISOString(),
    status: 'APPROVED',
    paymentMethod: 'CASH',
    customerName: 'Priya Mehra',
    customerPhone: '9812345678',
    calculatedAmount: 980,
    actualAmount: 980,
    discountAmount: 0,
    discountPercent: 0,
    currentVersionNo: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    items: [
      {
        id: 'bi_2',
        itemId: 'itm_kaju',
        quantity: 1,
        unitLabel: 'kg',
        pricePerUnit: 980,
        lineAmount: 980,
        baseQuantity: 1000,
      },
    ],
    reviews: [
      {
        id: 'rev_1',
        billId: 'bil_seed_2',
        reviewerId: 'usr_mgr1',
        reviewer: { id: 'usr_mgr1', fullName: 'Sanjay Gupta (Manager)', role: 'MANAGER' },
        decision: 'APPROVED',
        reason: 'Verified photo with physical slip',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
    ],
  },
];

const initialNotifications: NotificationItem[] = [
  {
    id: 'notif_1',
    userId: 'all',
    type: 'PENDING_BILL_REVIEW',
    title: 'New Bill Pending Review',
    message: 'Bill #101 was submitted for review. Total: ₹850',
    status: 'UNREAD',
    entityType: 'Bill',
    entityId: 'bil_seed_1',
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
];

const initialSequenceEvents: BillSequenceEvent[] = [
  {
    id: 'seq_1',
    billPadId: 'pad_shp1_1',
    billId: 'bil_seed_1',
    type: 'OUT_OF_ORDER',
    details: 'Bill #101 sequence check verified against previous bills.',
    status: 'RESOLVED',
    resolvedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
];

// In-Memory / Local Storage Store
class LocalStore {
  shops: Shop[] = load('shops', initialShops);
  units: Unit[] = load('units', initialUnits);
  conversions: UnitConversion[] = load('conversions', initialConversions);
  categories: Category[] = load('categories', initialCategories);
  items: Item[] = load('items', initialItems);
  pads: BillPad[] = load('pads', initialPads);
  transactions: InventoryTransaction[] = load('transactions', initialTransactions);
  bills: Bill[] = load('bills', initialBills);
  notifications: NotificationItem[] = load('notifications', initialNotifications);
  sequenceEvents: BillSequenceEvent[] = load('sequenceEvents', initialSequenceEvents);

  saveAll() {
    save('shops', this.shops);
    save('units', this.units);
    save('conversions', this.conversions);
    save('categories', this.categories);
    save('items', this.items);
    save('pads', this.pads);
    save('transactions', this.transactions);
    save('bills', this.bills);
    save('notifications', this.notifications);
    save('sequenceEvents', this.sequenceEvents);
  }

  // --- Helpers ---
  getActivePadForShop(shopId: string): BillPad {
    let pad = this.pads.find((p) => p.shopId === shopId && !p.closedAt);
    if (!pad) {
      pad = {
        id: `pad_${shopId}_${Date.now()}`,
        shopId,
        label: `Pad (${new Date().toLocaleDateString()})`,
        startedAt: new Date().toISOString(),
        closedAt: null,
      };
      this.pads.push(pad);
      this.saveAll();
    }
    return pad;
  }

  getItemPriceAtDate(itemId: string, date: Date = new Date()): number {
    const item = this.items.find((i) => i.id === itemId);
    if (!item || !item.prices || item.prices.length === 0) return 100;
    const sorted = [...item.prices]
      .filter((p) => new Date(p.effectiveDate).getTime() <= date.getTime())
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
    return sorted[0]?.pricePerUnit ?? item.prices[0].pricePerUnit;
  }

  calculateBaseQuantity(item: Item, quantity: number): number {
    if (item.baseUnitId === item.sellingUnitId) return quantity;
    const conv = this.conversions.find(
      (c) => c.fromUnitId === item.sellingUnitId && c.toUnitId === item.baseUnitId,
    );
    if (conv) return quantity * conv.factor;
    const sf = item.sellingUnit?.toCanonicalFactor ?? 1;
    const bf = item.baseUnit?.toCanonicalFactor ?? 1;
    if (bf > 0) return quantity * (sf / bf);
    return quantity;
  }

  getDerivedStock(shopId?: string, itemId?: string): DerivedStock[] {
    const result: DerivedStock[] = [];
    const targetShops = shopId ? this.shops.filter((s) => s.id === shopId) : this.shops;

    for (const shop of targetShops) {
      for (const item of this.items.filter((i) => i.isActive)) {
        if (itemId && item.id !== itemId) continue;
        const totalStock = this.transactions
          .filter((t) => t.shopId === shop.id && t.itemId === item.id)
          .reduce((sum, t) => sum + Number(t.quantityChange), 0);

        const cat = this.categories.find((c) => c.id === item.categoryId);

        result.push({
          shopId: shop.id,
          shopName: shop.name,
          itemId: item.id,
          itemName: item.name,
          categoryName: cat?.name ?? 'General',
          baseUnit: item.baseUnit?.symbol || item.baseUnit?.name || 'unit',
          sellingUnit: item.sellingUnit?.symbol || item.sellingUnit?.name || 'unit',
          currentStock: totalStock,
        });
      }
    }
    return result;
  }

  // --- Sequence Monitoring ---
  checkSequence(shopId: string, billId: string, billNumber: number): BillSequenceEvent | null {
    const pad = this.getActivePadForShop(shopId);
    const billsOnPad = this.bills
      .filter((b) => b.billPadId === pad.id && b.id !== billId)
      .sort((a, b) => b.billNumber - a.billNumber);

    if (billsOnPad.length === 0) return null;
    const highestNumber = billsOnPad[0].billNumber;

    let event: BillSequenceEvent | null = null;
    if (billNumber <= highestNumber) {
      event = {
        id: `seq_${Date.now()}`,
        billPadId: pad.id,
        billId,
        type: 'OUT_OF_ORDER',
        details: `Bill #${billNumber} submitted, but highest number on current pad was #${highestNumber}.`,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      };
    } else if (billNumber > highestNumber + 1) {
      const missingRange =
        billNumber - 1 === highestNumber + 1
          ? `#${highestNumber + 1}`
          : `#${highestNumber + 1} to #${billNumber - 1}`;
      event = {
        id: `seq_${Date.now()}`,
        billPadId: pad.id,
        billId,
        type: 'MISSING_NUMBER',
        details: `Gap detected: missing ${missingRange}. Current bill is #${billNumber}, previous was #${highestNumber}.`,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      };
    }

    if (event) {
      this.sequenceEvents.unshift(event);
      this.notifications.unshift({
        id: `notif_${Date.now()}`,
        userId: 'all',
        type: event.type === 'MISSING_NUMBER' ? 'MISSING_BILL_NUMBER' : 'BILL_SEQUENCE_MISMATCH',
        title: `Sequence Alert (${event.type})`,
        message: event.details,
        status: 'UNREAD',
        entityType: 'BillSequenceEvent',
        entityId: event.id,
        createdAt: new Date().toISOString(),
      });
      this.saveAll();
    }

    return event;
  }

  // --- Reports ---
  getAdminDashboard(): AdminDashboardData {
    const today = new Date().toDateString();
    const todayBills = this.bills.filter(
      (b) => new Date(b.billDate).toDateString() === today,
    );

    const todaySales = todayBills.reduce((acc, b) => acc + Number(b.actualAmount), 0);
    const totalDiscount = todayBills.reduce((acc, b) => acc + Number(b.discountAmount), 0);
    const pendingReviewCount = this.bills.filter(
      (b) => b.status === 'SUBMITTED' || b.status === 'UNDER_REVIEW',
    ).length;
    const disputedCount = this.bills.filter((b) => b.status === 'DISPUTED').length;

    const shopBreakdown = this.shops.map((shop) => {
      const sBills = todayBills.filter((b) => b.shopId === shop.id);
      return {
        shopId: shop.id,
        shopName: shop.name,
        todaySales: sBills.reduce((acc, b) => acc + Number(b.actualAmount), 0),
        todayBillsCount: sBills.length,
        todayDiscount: sBills.reduce((acc, b) => acc + Number(b.discountAmount), 0),
      };
    });

    return {
      todaySales,
      todayBillsCount: todayBills.length,
      pendingReviewCount,
      disputedCount,
      totalDiscount,
      shopBreakdown,
    };
  }

  getEmployeeDashboard(userId: string): EmployeeDashboardData {
    const today = new Date().toDateString();
    const userBills = this.bills.filter((b) => b.createdById === userId || userId.includes('emp'));
    const todayBills = userBills.filter(
      (b) => new Date(b.billDate).toDateString() === today,
    );

    return {
      currentShop: this.shops[0],
      todayStats: {
        billsCount: todayBills.length,
        todaySales: todayBills.reduce((acc, b) => acc + Number(b.actualAmount), 0),
        pendingCount: todayBills.filter((b) => b.status === 'SUBMITTED' || b.status === 'UNDER_REVIEW').length,
        approvedCount: todayBills.filter((b) => b.status === 'APPROVED').length,
        disputedCount: todayBills.filter((b) => b.status === 'DISPUTED').length,
      },
      recentBills: userBills.slice(0, 10),
    };
  }
}

export const mockStore = new LocalStore();
