package com.service.notification_service.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReservationCreatedEvent {
    private Integer reservationId;
    private Integer branchId;
    private String branchName;
    private Integer customerId;
    private String customerName;
    private String phone;
    private String email;
    private LocalDateTime reservedAt;
    private Integer partySize;
    private String notes;
    private Instant createdAt;
}

