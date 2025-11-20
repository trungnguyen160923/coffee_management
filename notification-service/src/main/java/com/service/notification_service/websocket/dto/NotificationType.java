package com.service.notification_service.websocket.dto;

public enum NotificationType {
    ORDER_CREATED,
    ORDER_STATUS_UPDATED,
    ORDER_CANCELLED,
    RESERVATION_CREATED,
    LOW_STOCK_ALERT,
    OUT_OF_STOCK_ALERT,
    STOCK_RECEIVED,
    REVENUE_REPORT,
    SYSTEM_ALERT
}

