export const LocationType = {
  WAREHOUSE: "WAREHOUSE",
  RETAIL_STORE: "RETAIL_STORE",
  SHOWROOM: "SHOWROOM",
  STORE: "STORE",
  TRANSIT_BUFFER: "TRANSIT_BUFFER",
} as const;
export type LocationType = (typeof LocationType)[keyof typeof LocationType];

export const UserRole = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
  WAREHOUSE_STAFF: "WAREHOUSE_STAFF",
  STAFF: "STAFF",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ProductCategory = {
  SCHOOL_SUPPLIES: "SCHOOL_SUPPLIES",
  OFFICE_SUPPLIES: "OFFICE_SUPPLIES",
  ART_SUPPLIES: "ART_SUPPLIES",
  GENERAL_MERCHANDISE: "GENERAL_MERCHANDISE",
  BAGS_ACCESSORIES: "BAGS_ACCESSORIES",
  ELECTRONICS: "ELECTRONICS",
  OTHER: "OTHER",
} as const;
export type ProductCategory =
  (typeof ProductCategory)[keyof typeof ProductCategory];

export const SellingUnit = {
  PIECE: "piece",
  CASE: "case",
} as const;
export type SellingUnit = (typeof SellingUnit)[keyof typeof SellingUnit];

export const JournalReferenceType = {
  SALE: "SALE",
  RECEIVING: "RECEIVING",
  TRANSFER_IN: "TRANSFER_IN",
  TRANSFER_OUT: "TRANSFER_OUT",
  ADJUSTMENT: "ADJUSTMENT",
  RETURN: "RETURN",
  STOCKTAKE: "STOCKTAKE",
  VOID: "VOID",
  OPENING_BALANCE: "OPENING_BALANCE",
} as const;
export type JournalReferenceType =
  (typeof JournalReferenceType)[keyof typeof JournalReferenceType];

export const ActorType = {
  USER: "USER",
  SYSTEM: "SYSTEM",
  INTEGRATION: "INTEGRATION",
} as const;
export type ActorType = (typeof ActorType)[keyof typeof ActorType];

export const AdjustmentReasonCode = {
  // Positive-only
  COUNT_GAIN: "COUNT_GAIN",
  FOUND_STOCK: "FOUND_STOCK",
  OPENING_BALANCE: "OPENING_BALANCE",
  // Negative-only
  COUNT_LOSS: "COUNT_LOSS",
  DAMAGED: "DAMAGED",
  DAMAGE_SHOWROOM: "DAMAGE_SHOWROOM",
  SHRINKAGE_MISSING: "SHRINKAGE_MISSING",
  OBSOLETE_WRITE_OFF: "OBSOLETE_WRITE_OFF",
  // Restricted (admin/owner only, notes mandatory)
  DATA_CORRECTION: "DATA_CORRECTION",
} as const;
export type AdjustmentReasonCode =
  (typeof AdjustmentReasonCode)[keyof typeof AdjustmentReasonCode];

export const AdjustmentDirection = {
  IN: "IN",
  OUT: "OUT",
} as const;
export type AdjustmentDirection =
  (typeof AdjustmentDirection)[keyof typeof AdjustmentDirection];

export const ShiftStatus = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  FORCE_CLOSED: "FORCE_CLOSED",
} as const;
export type ShiftStatus = (typeof ShiftStatus)[keyof typeof ShiftStatus];

/** Roles allowed to force-close shifts */
export const SHIFT_FORCE_CLOSE_ROLES = [UserRole.ADMIN, UserRole.MANAGER] as const;

export const SaleStatus = {
  QUOTE: "QUOTE",
  OPEN: "OPEN",
  PARKED: "PARKED",
  COMPLETED: "COMPLETED",
  VOIDED: "VOIDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  REFUNDED: "REFUNDED",
} as const;
export type SaleStatus = (typeof SaleStatus)[keyof typeof SaleStatus];

export const PaymentMethod = {
  CASH: "CASH",
  CARD: "CARD",
  CREDIT_CARD: "CREDIT_CARD",
  DEBIT_CARD: "DEBIT_CARD",
  EFT: "EFT",
  QRPH: "QRPH",
  GCASH: "GCASH",
  MAYA: "MAYA",
  BANK_TRANSFER: "BANK_TRANSFER",
  ACCOUNT: "ACCOUNT",
  OTHER: "OTHER",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const CustomerType = {
  INDIVIDUAL: "INDIVIDUAL",
  SHOP: "SHOP",
  FLEET: "FLEET",
  WHOLESALE: "WHOLESALE",
} as const;
export type CustomerType = (typeof CustomerType)[keyof typeof CustomerType];

export const CustomerTransactionType = {
  CHARGE: "CHARGE",
  PAYMENT: "PAYMENT",
  CREDIT_NOTE: "CREDIT_NOTE",
  ADJUSTMENT: "ADJUSTMENT",
} as const;
export type CustomerTransactionType =
  (typeof CustomerTransactionType)[keyof typeof CustomerTransactionType];

/** Roles allowed to manage customer accounts (create, edit, record payments) */
export const AR_ROLES = [UserRole.ADMIN, UserRole.MANAGER] as const;

export const PurchaseOrderStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  PARTIALLY_RECEIVED: "PARTIALLY_RECEIVED",
  FULLY_RECEIVED: "FULLY_RECEIVED",
  CLOSED_WITH_VARIANCE: "CLOSED_WITH_VARIANCE",
  CANCELLED: "CANCELLED",
} as const;
export type PurchaseOrderStatus =
  (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus];


export const CountStatus = {
  DRAFT: "DRAFT",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  REVIEWED: "REVIEWED",
  POSTED: "POSTED",
  CANCELLED: "CANCELLED",
} as const;
export type CountStatus = (typeof CountStatus)[keyof typeof CountStatus];

export const CountScope = {
  FULL_LOCATION: "FULL_LOCATION",
  CATEGORY: "CATEGORY",
  FAMILY: "FAMILY",
  SELECTED_SKUS: "SELECTED_SKUS",
} as const;
export type CountScope = (typeof CountScope)[keyof typeof CountScope];

/** Roles allowed to create / manage inventory counts */
export const COUNT_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE_STAFF] as const;

/** Roles allowed to review and post count variances */
export const COUNT_REVIEW_ROLES = [UserRole.ADMIN, UserRole.MANAGER] as const;

// ── Domain Validation Helpers ──

/** Valid status transitions for sales */
export const SALE_TRANSITIONS: Record<SaleStatus, SaleStatus[]> = {
  [SaleStatus.QUOTE]: [SaleStatus.OPEN, SaleStatus.VOIDED],
  [SaleStatus.OPEN]: [SaleStatus.COMPLETED, SaleStatus.PARKED, SaleStatus.VOIDED],
  [SaleStatus.PARKED]: [SaleStatus.OPEN, SaleStatus.VOIDED],
  [SaleStatus.COMPLETED]: [SaleStatus.PARTIALLY_REFUNDED, SaleStatus.REFUNDED],
  [SaleStatus.PARTIALLY_REFUNDED]: [SaleStatus.PARTIALLY_REFUNDED, SaleStatus.REFUNDED],
  [SaleStatus.VOIDED]: [],
  [SaleStatus.REFUNDED]: [],
};

/** Check if a sale status transition is valid */
export function isValidSaleTransition(from: SaleStatus, to: SaleStatus): boolean {
  return SALE_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Roles allowed to operate the POS */
export const POS_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER] as const;

/** Roles allowed to refund */
export const REFUND_ROLES = [UserRole.ADMIN, UserRole.MANAGER] as const;

/** Roles allowed to manage procurement */
export const PROCUREMENT_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE_STAFF] as const;


/** Valid status transitions for purchase orders */
export const PO_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  [PurchaseOrderStatus.DRAFT]: [PurchaseOrderStatus.SUBMITTED, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.SUBMITTED]: [
    PurchaseOrderStatus.PARTIALLY_RECEIVED,
    PurchaseOrderStatus.FULLY_RECEIVED,
    PurchaseOrderStatus.CANCELLED,
  ],
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: [
    PurchaseOrderStatus.PARTIALLY_RECEIVED,
    PurchaseOrderStatus.FULLY_RECEIVED,
    PurchaseOrderStatus.CLOSED_WITH_VARIANCE,
  ],
  [PurchaseOrderStatus.FULLY_RECEIVED]: [],
  [PurchaseOrderStatus.CLOSED_WITH_VARIANCE]: [],
  [PurchaseOrderStatus.CANCELLED]: [],
};

/** Check if a PO status transition is valid */
export function isValidPOTransition(
  from: PurchaseOrderStatus,
  to: PurchaseOrderStatus,
): boolean {
  return PO_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Reason codes that ONLY allow positive (IN) adjustments */
export const POSITIVE_ONLY_REASON_CODES: AdjustmentReasonCode[] = [
  AdjustmentReasonCode.COUNT_GAIN,
  AdjustmentReasonCode.FOUND_STOCK,
  AdjustmentReasonCode.OPENING_BALANCE,
];

/** Reason codes that ONLY allow negative (OUT) adjustments */
export const NEGATIVE_ONLY_REASON_CODES: AdjustmentReasonCode[] = [
  AdjustmentReasonCode.COUNT_LOSS,
  AdjustmentReasonCode.DAMAGED,
  AdjustmentReasonCode.DAMAGE_SHOWROOM,
  AdjustmentReasonCode.SHRINKAGE_MISSING,
  AdjustmentReasonCode.OBSOLETE_WRITE_OFF,
];

/** Reason codes restricted to admin/owner roles */
export const RESTRICTED_REASON_CODES: AdjustmentReasonCode[] = [
  AdjustmentReasonCode.DATA_CORRECTION,
];


/** Check if reason code direction matches request direction */
export function isReasonCodeValidForDirection(
  reasonCode: AdjustmentReasonCode,
  direction: AdjustmentDirection,
): boolean {
  if (reasonCode === AdjustmentReasonCode.DATA_CORRECTION) {
    return true; // DATA_CORRECTION can be either direction
  }
  if (direction === AdjustmentDirection.IN) {
    return POSITIVE_ONLY_REASON_CODES.includes(reasonCode);
  }
  return NEGATIVE_ONLY_REASON_CODES.includes(reasonCode);
}

