package com.service.catalog.constants;

/**
 * Constants for Goods Receipt Status Management
 */
public class ReceiptStatusConstants {
    
    // Basic statuses
    public static final String OK = "OK";
    public static final String SHORT = "SHORT";
    public static final String OVER = "OVER";
    public static final String DAMAGE = "DAMAGE";
    public static final String RETURN = "RETURN";
    
    // Detailed statuses
    public static final String SHORT_ACCEPTED = "SHORT_ACCEPTED";
    public static final String SHORT_PENDING = "SHORT_PENDING";
    public static final String OVER_ACCEPTED = "OVER_ACCEPTED";
    public static final String OVER_ADJUSTED = "OVER_ADJUSTED";
    public static final String OVER_RETURN = "OVER_RETURN";
    public static final String DAMAGE_ACCEPTED = "DAMAGE_ACCEPTED";
    public static final String DAMAGE_RETURN = "DAMAGE_RETURN";
    public static final String DAMAGE_PARTIAL = "DAMAGE_PARTIAL";
    
    // Status groups for business logic
    public static final String[] CLOSING_STATUSES = {
        SHORT_ACCEPTED, OVER_ACCEPTED, DAMAGE_ACCEPTED
    };
    
    public static final String[] ALLOW_MORE_RECEIPTS_STATUSES = {
        SHORT_PENDING, OVER_ADJUSTED, DAMAGE_PARTIAL
    };
    
    /**
     * Check if status allows receiving more items
     */
    public static boolean allowsMoreReceipts(String status) {
        for (String allowedStatus : ALLOW_MORE_RECEIPTS_STATUSES) {
            if (allowedStatus.equals(status)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Check if status closes the receipt (no more receipts allowed)
     */
    public static boolean closesReceipt(String status) {
        for (String closingStatus : CLOSING_STATUSES) {
            if (closingStatus.equals(status)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get human-readable message for status
     */
    public static String getDisplayMessage(String status) {
        switch (status) {
            case SHORT_ACCEPTED:
                return "✅ Shortage accepted - no follow up needed";
            case SHORT_PENDING:
                return "⚠️ Shortage pending - follow up required";
            case OVER_ACCEPTED:
                return "✅ Overage accepted - keeping all items";
            case OVER_ADJUSTED:
                return "📝 Order adjusted to match received quantity";
            case OVER_RETURN:
                return "↩️ Excess items returned to supplier";
            case DAMAGE_ACCEPTED:
                return "⚡ Damaged items accepted into inventory";
            case DAMAGE_RETURN:
                return "↩️ Damaged items returned to supplier";
            case DAMAGE_PARTIAL:
                return "🔧 Partial damage - only good items accepted";
            default:
                return status;
        }
    }
}
