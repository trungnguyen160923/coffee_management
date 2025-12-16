package com.service.profile.configuration;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

/**
 * Configuration properties cho Payroll Management
 * Các giá trị này có thể được override từ .env hoặc environment variables
 */
@Configuration
@ConfigurationProperties(prefix = "app.payroll")
@Getter
@Setter
public class PayrollProperties {

    /**
     * Số giờ làm việc tối đa trong 1 ngày (theo quy định lao động VN)
     */
    private BigDecimal maxDailyHours = BigDecimal.valueOf(8);

    /**
     * Giảm trừ gia cảnh bản thân (VNĐ/tháng)
     */
    private BigDecimal personalDeduction = BigDecimal.valueOf(11000000); // 11tr

    /**
     * Giảm trừ gia cảnh cho người phụ thuộc (VNĐ/người/tháng)
     */
    private BigDecimal dependentDeduction = BigDecimal.valueOf(4400000); // 4.4tr

    /**
     * Tỷ lệ đóng bảo hiểm (BHXH 8% + BHYT 1.5% + BHTN 1% = 10.5%)
     */
    private BigDecimal insuranceRate = BigDecimal.valueOf(0.105);

    /**
     * Hệ số OT mặc định (ngày thường)
     */
    private BigDecimal defaultOvertimeRate = BigDecimal.valueOf(1.5);

    /**
     * Hệ số OT cho cuối tuần (Thứ 7, CN)
     */
    private BigDecimal weekendOvertimeMultiplier = BigDecimal.valueOf(1.33); // 1.5 × 1.33 ≈ 2.0x

    /**
     * Hệ số OT cho ngày lễ/Tết
     */
    private BigDecimal holidayOvertimeMultiplier = BigDecimal.valueOf(2.0); // 1.5 × 2.0 = 3.0x

    /**
     * Số ngày công chuẩn trong tháng (để tính lương full-time)
     */
    private Integer standardWorkingDaysPerMonth = 26;

    /**
     * Số giờ công chuẩn trong ngày (để tính lương full-time)
     */
    private BigDecimal standardWorkingHoursPerDay = BigDecimal.valueOf(8);
}

