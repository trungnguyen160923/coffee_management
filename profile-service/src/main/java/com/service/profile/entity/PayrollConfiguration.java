package com.service.profile.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "payroll_configurations")
public class PayrollConfiguration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "config_id")
    Integer configId;

    @Column(name = "config_key", nullable = false, unique = true, length = 100)
    String configKey;

    @Column(name = "config_value", nullable = false, precision = 15, scale = 6)
    BigDecimal configValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "config_type", nullable = false, length = 20)
    ConfigType configType;

    @Column(name = "display_name", nullable = false, length = 255)
    String displayName;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @Column(name = "unit", length = 50)
    String unit;

    @Column(name = "min_value", precision = 15, scale = 6)
    BigDecimal minValue;

    @Column(name = "max_value", precision = 15, scale = 6)
    BigDecimal maxValue;

    @Column(name = "is_active")
    Boolean isActive;

    @Column(name = "updated_by")
    Integer updatedBy;

    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;

    @Column(name = "update_at", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    LocalDateTime updateAt;

    public enum ConfigType {
        RATE,      // Tỷ lệ % (ví dụ: 0.105 = 10.5%)
        AMOUNT,    // Số tiền VNĐ
        DAYS,      // Số ngày
        HOURS,     // Số giờ
        MULTIPLIER // Hệ số nhân
    }
}

