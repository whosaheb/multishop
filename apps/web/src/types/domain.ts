import { Role } from './auth';

export type ShopStatus = 'ACTIVE' | 'INACTIVE';
export type UnitType = 'WEIGHT' | 'VOLUME' | 'LENGTH' | 'COUNT';
export type SequenceEventType = 'MISSING_NUMBER' | 'OUT_OF_ORDER';
export type SequenceEventStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED_NEW_PAD'
  | 'ACKNOWLEDGED_INVESTIGATING'
  | 'RESOLVED';
export type BillStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'DISPUTED';
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD';
export type BillReviewDecision = 'APPROVED' | 'DISPUTED';
export type ModificationRequestStatus = 'PENDING' | 'RESOLVED' | 'DECLINED';
export type InventoryTransactionType =
  | 'RECEIVE'
  | 'BILL_SALE'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'ADJUSTMENT'
  | 'BILL_CORRECTION';
export type NotificationType =
  | 'PENDING_BILL_REVIEW'
  | 'BILL_DISPUTED'
  | 'BILL_SEQUENCE_MISMATCH'
  | 'MISSING_BILL_NUMBER'
  | 'NEGATIVE_STOCK'
  | 'MODIFICATION_REQUESTED'
  | 'OTHER';
export type NotificationStatus = 'UNREAD' | 'READ';

export interface Category {
  id: string;
  name: string;
  createdAt?: string;
}

export interface Unit {
  id: string;
  name: string;
  symbol: string;
  type: UnitType;
  toCanonicalFactor: number;
}

export interface UnitConversion {
  id: string;
  fromUnitId: string;
  toUnitId: string;
  factor: number;
}

export interface ItemPrice {
  id: string;
  itemId: string;
  pricePerUnit: number;
  effectiveDate: string;
  setById?: string;
  createdAt?: string;
}

export interface Item {
  id: string;
  name: string;
  categoryId?: string;
  category?: Category;
  baseUnitId: string;
  baseUnit: Unit;
  sellingUnitId: string;
  sellingUnit: Unit;
  isActive: boolean;
  prices?: ItemPrice[];
}

export interface Shop {
  id: string;
  name: string;
  code: string;
  status: ShopStatus;
  address?: string;
}

export interface BillAttachment {
  id: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  hash: string;
  uploadedAt?: string;
}

export interface BillItem {
  id: string;
  billId?: string;
  itemId: string;
  item?: Item;
  quantity: number;
  unitLabel: string;
  pricePerUnit: number;
  lineAmount: number;
  baseQuantity: number;
}

export interface BillReview {
  id: string;
  billId: string;
  reviewerId: string;
  reviewer?: { id: string; fullName: string; role: Role };
  decision: BillReviewDecision;
  reason?: string;
  createdAt: string;
}

export interface BillVersionItem {
  id: string;
  billVersionId: string;
  itemId: string;
  item?: Item;
  quantity: number;
  unitLabel: string;
  pricePerUnit: number;
  lineAmount: number;
  baseQuantity: number;
}

export interface BillVersion {
  id: string;
  billId: string;
  versionNumber: number;
  authoredById: string;
  authoredBy?: { id: string; fullName: string };
  reason: string;
  billDate: string;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  calculatedAmount: number;
  actualAmount: number;
  discountAmount: number;
  createdAt: string;
  items?: BillVersionItem[];
}

export interface BillModificationRequest {
  id: string;
  billId: string;
  bill?: Bill;
  requestedById: string;
  requestedBy?: { id: string; fullName: string; role: Role };
  reason: string;
  status: ModificationRequestStatus;
  resolvedById?: string;
  resolvedBy?: { id: string; fullName: string };
  resolvedAt?: string;
  resultingVersionNo?: number;
  createdAt: string;
}

export interface Bill {
  id: string;
  shopId: string;
  shop?: Shop;
  createdById: string;
  createdBy?: { id: string; fullName: string; mobileNumber: string; role: Role };
  billNumber: number;
  billPadId: string;
  billDate: string;
  status: BillStatus;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  calculatedAmount: number;
  actualAmount: number;
  discountAmount: number;
  discountPercent: number;
  attachmentId?: string;
  attachment?: BillAttachment;
  currentVersionNo: number;
  items: BillItem[];
  versions?: BillVersion[];
  reviews?: BillReview[];
  modificationRequests?: BillModificationRequest[];
  createdAt: string;
}

export interface BillPad {
  id: string;
  shopId: string;
  shop?: Shop;
  label?: string;
  startedAt: string;
  closedAt?: string | null;
}

export interface BillSequenceEvent {
  id: string;
  billPadId: string;
  billPad?: BillPad;
  billId: string;
  bill?: Bill;
  type: SequenceEventType;
  details: string;
  status: SequenceEventStatus;
  shopId?: string;
  shop?: Shop;
  resolvedById?: string;
  resolvedBy?: { id: string; fullName: string };
  resolvedAt?: string;
  createdAt: string;
}

export interface DerivedStock {
  shopId: string;
  shopName: string;
  itemId: string;
  itemName: string;
  categoryName: string;
  baseUnit: string;
  sellingUnit: string;
  currentStock: number;
}

export interface InventoryTransaction {
  id: string;
  shopId: string;
  shop?: Shop;
  itemId: string;
  item?: Item;
  type: InventoryTransactionType;
  quantityChange: number;
  billId?: string;
  stockTransferId?: string;
  stockAdjustmentId?: string;
  note?: string;
  performedById: string;
  performedBy?: { id: string; fullName: string; role: Role };
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  entityType?: string;
  entityId?: string;
  createdAt: string;
  readAt?: string;
}

export interface AdminDashboardData {
  todaySales: number;
  todayBillsCount: number;
  pendingReviewCount: number;
  disputedCount: number;
  totalDiscount: number;
  shopBreakdown: {
    shopId: string;
    shopName: string;
    todaySales: number;
    todayBillsCount: number;
    todayDiscount: number;
  }[];
}

export interface EmployeeDashboardData {
  currentShop: Shop | null;
  todayStats: {
    billsCount: number;
    todaySales: number;
    pendingCount: number;
    approvedCount: number;
    disputedCount: number;
  };
  recentBills: Bill[];
}
