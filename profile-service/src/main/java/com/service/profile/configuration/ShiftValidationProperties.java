package com.service.profile.configuration;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

/**
 * Configuration properties cho Shift Validation Rules
 * Các giá trị này có thể được override từ .env hoặc environment variables
 */
@Configuration
@ConfigurationProperties(prefix = "app.shift.validation")
@Getter
@Setter
public class ShiftValidationProperties {

    /**
     * Số giờ làm việc tối đa trong 1 ngày
     */
    private BigDecimal maxDailyHours = BigDecimal.valueOf(8);

    /**
     * Số giờ làm việc tối đa trong 1 tuần
     */
    private BigDecimal maxWeeklyHours = BigDecimal.valueOf(40);

    /**
     * Số giờ nghỉ tối thiểu giữa 2 ca (ca đêm)
     */
    private BigDecimal minRestHoursNightShift = BigDecimal.valueOf(12);

    /**
     * Số giờ nghỉ tối thiểu giữa 2 ca (ca ngày)
     */
    private BigDecimal minRestHoursDayShift = BigDecimal.valueOf(10);

    /**
     * Số ca tối đa trong 1 ngày
     */
    private Integer maxShiftsPerDay = 2;

    /**
     * Số ca tối đa trong 1 tuần
     */
    private Integer maxShiftsPerWeek = 6;

    /**
     * Số ngày làm việc liên tiếp tối đa
     */
    private Integer maxConsecutiveDays = 6;

    /**
     * Thời lượng ca làm việc tối đa (giờ)
     */
    private BigDecimal maxShiftDuration = BigDecimal.valueOf(10);

    /**
     * Thời lượng ca làm việc tối thiểu (giờ)
     */
    private BigDecimal minShiftDuration = BigDecimal.valueOf(2);

    /**
     * Số giờ OT tối đa trong 1 tuần
     */
    private BigDecimal maxOvertimePerWeek = BigDecimal.valueOf(12);

    /**
     * Số giờ OT tối đa trong 1 ngày (theo quy định lao động VN: 8h + 4h = 12h/ngày)
     */
    private BigDecimal maxOvertimePerDay = BigDecimal.valueOf(4);

    /**
     * Số ngày cuối tuần tối đa trong 1 tuần
     */
    private Integer maxWeekendDaysPerWeek = 1;

    /**
     * Số tháng tối đa có thể đăng ký ca trước
     */
    private Integer maxMonthsInAdvance = 3;
}

