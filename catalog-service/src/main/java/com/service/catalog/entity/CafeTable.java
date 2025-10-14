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
@Table(name = "tables", uniqueConstraints = {
        @UniqueConstraint(name = "ux_tables_branch_label", columnNames = {"branch_id", "label"})
})
public class CafeTable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "table_id")
    Integer tableId;

    @Column(name = "branch_id", nullable = false)
    Integer branchId;

    @Column(nullable = false, length = 50)
    String label;

    @Column(nullable = false)
    Integer capacity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    TableStatus status;

    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;

    @Column(name = "update_at", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    LocalDateTime updateAt;

    public enum TableStatus {
        AVAILABLE,
        OCCUPIED,
        RESERVED,
        MAINTENANCE
    }
}
