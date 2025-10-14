// Receipt Status Enums for Goods Receipt Management

export enum ReceiptStatus {
  // Basic statuses
  OK = 'OK',
  SHORT = 'SHORT',
  OVER = 'OVER',
  DAMAGE = 'DAMAGE',
  RETURN = 'RETURN',
  
  // Detailed statuses
  SHORT_ACCEPTED = 'SHORT_ACCEPTED',
  SHORT_PENDING = 'SHORT_PENDING',
  OVER_ACCEPTED = 'OVER_ACCEPTED',
  OVER_ADJUSTED = 'OVER_ADJUSTED',
  OVER_RETURN = 'OVER_RETURN',
  DAMAGE_ACCEPTED = 'DAMAGE_ACCEPTED',
  DAMAGE_RETURN = 'DAMAGE_RETURN',
  DAMAGE_PARTIAL = 'DAMAGE_PARTIAL'
}

export enum ReceiptStatusMessage {
  // Shortage messages
  ACCEPTED_SHORTAGE = '✅ ACCEPTED SHORTAGE',
  SHORT_PENDING = '⚠️ SHORT PENDING',
  
  // Overage messages
  ACCEPTED_OVERAGE = '✅ ACCEPTED OVERAGE',
  ADJUSTING_ORDER = '✅ ADJUSTING ORDER',
  
  // Damage messages
  FULL_DAMAGE_ACCEPTED = 'FULL DAMAGE ACCEPTED',
  RETURN_DAMAGED = 'RETURN DAMAGED',
  PARTIAL_DAMAGE_ACCEPTED = 'PARTIAL DAMAGE ACCEPTED'
}

export enum ReceiptStatusLabels {
  // Button labels
  ACCEPT_SHORTAGE = 'Accept Shortage',
  FOLLOW_UP_SHORTAGE = 'Follow Up',
  ACCEPT_OVERAGE = 'Accept Overage',
  ADJUST_ORDER = 'Adjust Order',
  RETURN_EXCESS = 'Return Excess',
  TAKE_GOOD_PARTS = 'Take Good Parts',
  RETURN_DAMAGED = 'Return Damaged',
  ACCEPT_FULL_DAMAGE = 'Accept Full Damage'
}

// Status mapping for UI display
export const StatusDisplayConfig = {
  [ReceiptStatus.SHORT_ACCEPTED]: {
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    icon: '✅'
  },
  [ReceiptStatus.SHORT_PENDING]: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    icon: '⚠️'
  },
  [ReceiptStatus.OVER_ACCEPTED]: {
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    icon: '✅'
  },
  [ReceiptStatus.OVER_ADJUSTED]: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    icon: '📝'
  },
  [ReceiptStatus.OVER_RETURN]: {
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    icon: '↩️'
  },
  [ReceiptStatus.DAMAGE_ACCEPTED]: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    icon: '⚡'
  },
  [ReceiptStatus.DAMAGE_RETURN]: {
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    icon: '↩️'
  },
  [ReceiptStatus.DAMAGE_PARTIAL]: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    icon: '🔧'
  }
} as const;
