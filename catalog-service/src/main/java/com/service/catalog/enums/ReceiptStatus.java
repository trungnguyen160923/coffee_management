package com.service.catalog.enums;

/**
 * Enum for Goods Receipt Status Management
 */
public enum ReceiptStatus {
    // Basic statuses
    OK("OK", "Normal receipt"),
    SHORT("SHORT", "Shortage detected"),
    OVER("OVER", "Overage detected"),
    DAMAGE("DAMAGE", "Damage detected"),
    RETURN("RETURN", "Items returned"),
    
    // Detailed statuses
    SHORT_ACCEPTED("SHORT_ACCEPTED", "Shortage accepted - no follow up needed"),
    SHORT_PENDING("SHORT_PENDING", "Shortage pending - follow up required"),
    OVER_ACCEPTED("OVER_ACCEPTED", "Overage accepted - keep all items"),
    OVER_ADJUSTED("OVER_ADJUSTED", "Order adjusted to match received quantity"),
    OVER_RETURN("OVER_RETURN", "Excess items returned to supplier"),
    DAMAGE_ACCEPTED("DAMAGE_ACCEPTED", "Damaged items accepted into inventory"),
    DAMAGE_RETURN("DAMAGE_RETURN", "Damaged items returned to supplier"),
    DAMAGE_PARTIAL("DAMAGE_PARTIAL", "Partial damage - only good items accepted");
    
    private final String code;
    private final String description;
    
    ReceiptStatus(String code, String description) {
        this.code = code;
        this.description = description;
    }
    
    public String getCode() {
        return code;
    }
    
    public String getDescription() {
        return description;
    }
    
    /**
     * Check if this status allows receiving more items
     */
    public boolean allowsMoreReceipts() {
        return this == SHORT_PENDING || this == OVER_ADJUSTED || this == DAMAGE_PARTIAL;
    }
    
    /**
     * Check if this status closes the receipt (no more receipts allowed)
     */
    public boolean closesReceipt() {
        return this == SHORT_ACCEPTED || this == OVER_ACCEPTED || this == DAMAGE_ACCEPTED;
    }
    
    /**
     * Get human-readable message for this status
     */
    public String getDisplayMessage() {
        switch (this) {
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
                return description;
        }
    }
}
