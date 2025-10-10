package com.service.catalog.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "po_outbox_logs")
public class PoOutboxLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "po_id")
    PurchaseOrder purchaseOrder;

    @Column(name = "to_email", nullable = false, length = 200)
    String toEmail;

    @Column(name = "cc", length = 500)
    String cc;

    @Column(name = "subject", length = 200)
    String subject;

    @Column(name = "sent_at", nullable = false, columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime sentAt;

    @Column(name = "status", nullable = false, length = 50)
    String status;

    @Column(name = "message_id", length = 200)
    String messageId;

    @Column(name = "error", length = 500)
    String error;

    @Column(name = "create_at", nullable = false, columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;
}


