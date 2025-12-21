package com.service.profile.service;

import com.service.profile.configuration.PayrollProperties;
import com.service.profile.dto.request.PayrollCalculationRequest;
import com.service.profile.dto.response.PayrollResponse;
import com.service.profile.entity.*;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.mapper.PayrollMapper;
import com.service.profile.repository.*;
import com.service.profile.repository.http_client.AuthClient;
import com.service.profile.repository.http_client.BranchClient;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PayrollService {

    PayrollRepository payrollRepository;
    BonusRepository bonusRepository;
    PenaltyRepository penaltyRepository;
    AllowanceRepository allowanceRepository;
    StaffProfileRepository staffProfileRepository;
    ManagerProfileRepository managerProfileRepository;
    ShiftAssignmentRepository shiftAssignmentRepository;
    HolidayRepository holidayRepository;
    PayrollMapper payrollMapper;
    PayrollProperties payrollProperties; // Fallback nếu config không có trong DB
    PayrollConfigurationService payrollConfigurationService;
    AuthClient authClient;
    BranchClient branchClient;

    /**
     * Tính lương cho nhân viên
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public PayrollResponse calculatePayroll(PayrollCalculationRequest request, Integer currentUserId, String currentUserRole) {
        Integer userId = request.getUserId();
        String period = request.getPeriod();

        // Kiểm tra payroll đã tồn tại chưa
        if (payrollRepository.existsByUserIdAndPeriod(userId, period)) {
            throw new AppException(ErrorCode.PAYROLL_ALREADY_EXISTS);
        }

        // Xác định role và lấy profile
        Payroll.UserRole userRole;
        Integer branchId;
        BigDecimal baseSalary;
        BigDecimal hourlyRate;
        BigDecimal insuranceSalary;
        BigDecimal overtimeRate;
        Integer numberOfDependents;

        if (isStaff(userId)) {
            userRole = Payroll.UserRole.STAFF;
            StaffProfile staffProfile = staffProfileRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
            branchId = staffProfile.getBranchId();
            baseSalary = staffProfile.getBaseSalary();
            hourlyRate = staffProfile.getHourlyRate();
            insuranceSalary = staffProfile.getInsuranceSalary() != null && 
                staffProfile.getInsuranceSalary().compareTo(BigDecimal.ZERO) > 0 ?
                staffProfile.getInsuranceSalary() : staffProfile.getBaseSalary();
            overtimeRate = staffProfile.getOvertimeRate() != null ? 
                staffProfile.getOvertimeRate() : getConfigValue("default_overtime_rate", payrollProperties.getDefaultOvertimeRate());
            numberOfDependents = staffProfile.getNumberOfDependents() != null ? 
                staffProfile.getNumberOfDependents() : 0;
        } else if (isManager(userId)) {
            userRole = Payroll.UserRole.MANAGER;
            ManagerProfile managerProfile = managerProfileRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
            branchId = managerProfile.getBranchId();
            baseSalary = managerProfile.getBaseSalary();
            hourlyRate = BigDecimal.ZERO; // Manager không có hourly rate
            insuranceSalary = managerProfile.getInsuranceSalary() != null && 
                managerProfile.getInsuranceSalary().compareTo(BigDecimal.ZERO) > 0 ?
                managerProfile.getInsuranceSalary() : managerProfile.getBaseSalary();
            // Manager hiện không có cấu hình overtime riêng, dùng default
            overtimeRate = getConfigValue("default_overtime_rate", payrollProperties.getDefaultOvertimeRate());
            numberOfDependents = managerProfile.getNumberOfDependents() != null ? 
                managerProfile.getNumberOfDependents() : 0;
        } else {
            throw new AppException(ErrorCode.USER_ID_NOT_FOUND);
        }

        // Validate phân quyền
        validateAuthorization(currentUserId, currentUserRole, userId, userRole, branchId);

        // Tính base salary
        BigDecimal calculatedBaseSalary = calculateBaseSalary(userId, period, baseSalary, hourlyRate);

        // Tính overtime - CHỈ TÍNH CHO STAFF, KHÔNG TÍNH CHO MANAGER
        BigDecimal overtimeHours = BigDecimal.ZERO;
        BigDecimal overtimePay = BigDecimal.ZERO;
        
        if (userRole == Payroll.UserRole.STAFF) {
            // Chỉ tính OT cho Staff (có shift assignments)
            overtimeHours = calculateOvertimeHoursForPeriod(userId, period);
            overtimePay = calculateOvertimePay(userId, period, calculatedBaseSalary, hourlyRate, overtimeRate);
        }
        // Manager: overtimeHours = 0, overtimePay = 0 (không có điểm danh, không tính OT)

        // Tính allowances, bonuses, penalties
        BigDecimal totalAllowances = calculateTotalAllowances(userId, period);
        BigDecimal totalBonuses = calculateTotalBonuses(userId, period);
        BigDecimal totalPenalties = calculateTotalPenalties(userId, period);

        // Tính gross salary
        BigDecimal grossSalary = calculatedBaseSalary
            .add(overtimePay)
            .add(totalAllowances)
            .add(totalBonuses);

        // Tính deductions
        BigDecimal amountInsurances = calculateInsuranceDeduction(insuranceSalary);
        BigDecimal amountTax = calculatePersonalIncomeTax(grossSalary, amountInsurances, numberOfDependents);
        BigDecimal amountAdvances = BigDecimal.ZERO; // TODO: Implement advances if needed
        BigDecimal totalDeductions = amountInsurances.add(amountTax).add(amountAdvances);

        // Tính net salary
        BigDecimal netSalary = grossSalary.subtract(totalDeductions).subtract(totalPenalties);

        // Tạo payroll
        Payroll payroll = Payroll.builder()
            .userId(userId)
            .userRole(userRole)
            .branchId(branchId)
            .period(period)
            .baseSalary(calculatedBaseSalary)
            .baseSalarySnapshot(baseSalary)
            .hourlyRateSnapshot(hourlyRate)
            .insuranceSalarySnapshot(insuranceSalary)
            .overtimeHours(overtimeHours)
            .overtimePay(overtimePay)
            .totalAllowances(totalAllowances)
            .totalBonuses(totalBonuses)
            .totalPenalties(totalPenalties)
            .grossSalary(grossSalary)
            .amountInsurances(amountInsurances)
            .amountTax(amountTax)
            .amountAdvances(amountAdvances)
            .totalDeductions(totalDeductions)
            .netSalary(netSalary)
            .status(Payroll.PayrollStatus.DRAFT)
            .createdBy(currentUserId)
            .notes(request.getNotes())
            .createAt(LocalDateTime.now())
            .updateAt(LocalDateTime.now())
            .build();

        payrollRepository.save(payroll);

        return payrollMapper.toPayrollResponse(payroll);
    }

    /**
     * Tính base salary
     */
    private BigDecimal calculateBaseSalary(Integer userId, String period, BigDecimal baseSalary, BigDecimal hourlyRate) {
        // Kiểm tra xem là Staff hay Manager
        Optional<StaffProfile> staffProfileOpt = staffProfileRepository.findById(userId);
        
        if (staffProfileOpt.isPresent()) {
            StaffProfile staffProfile = staffProfileOpt.get();
            String payType = staffProfile.getPayType();
            
            if ("HOURLY".equals(payType)) {
                // Part-time: Tính theo giờ
                return calculateHourlyBaseSalary(userId, period, hourlyRate);
            } else {
                // Full-time: Lương cứng
                return baseSalary;
            }
        } else {
            // Manager: Lương cứng
            return baseSalary;
        }
    }

    /**
     * Tính base salary cho part-time (theo giờ)
     * Tính từ shift start time đến shift end time (không phụ thuộc vào check-in/check-out)
     */
    private BigDecimal calculateHourlyBaseSalary(Integer userId, String period, BigDecimal hourlyRate) {
        YearMonth yearMonth = YearMonth.parse(period);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        // Lấy thông tin staff để kiểm tra employmentType
        Optional<StaffProfile> staffProfileOpt = staffProfileRepository.findById(userId);
        final String staffEmploymentType = staffProfileOpt
            .map(StaffProfile::getEmploymentType)
            .orElse(null);

        // Lấy tất cả shift assignments đã hoàn thành trong kỳ
        List<ShiftAssignment> completedShifts = shiftAssignmentRepository
            .findByStaffUserIdAndShift_ShiftDateBetween(userId, startDate, endDate);

        // Lọc chỉ các shift có status = CHECKED_OUT và phù hợp với employmentType
        BigDecimal totalHours = completedShifts.stream()
            .filter(sa -> {
                // Chỉ tính các ca đã CHECKED_OUT
                if (!"CHECKED_OUT".equals(sa.getStatus())) {
                    return false;
                }
                
                // Lọc theo employmentType của shift (nếu staff có employmentType)
                if (staffEmploymentType != null && !"ANY".equals(staffEmploymentType)) {
                    Shift shift = sa.getShift();
                    if (shift != null) {
                        String shiftEmploymentType = shift.getEmploymentType();
                        // Nếu shift không có employmentType, lấy từ template
                        if (shiftEmploymentType == null && shift.getTemplate() != null) {
                            shiftEmploymentType = shift.getTemplate().getEmploymentType();
                        }
                        // Nếu vẫn null, mặc định là "ANY"
                        if (shiftEmploymentType == null) {
                            shiftEmploymentType = "ANY";
                        }
                        // Chỉ tính nếu shift là "ANY" hoặc match với employmentType của staff
                        if (!"ANY".equals(shiftEmploymentType) && !shiftEmploymentType.equals(staffEmploymentType)) {
                            return false;
                        }
                    }
                }
                
                return true;
            })
            .map(sa -> {
                Shift shift = sa.getShift();
                if (shift != null && shift.getStartTime() != null && shift.getEndTime() != null) {
                    // Tính từ shift start time đến shift end time
                    java.time.Duration duration = java.time.Duration.between(
                        shift.getStartTime(), 
                        shift.getEndTime()
                    );
                    long minutes = duration.toMinutes();
                    // Xử lý trường hợp end time < start time (ca qua đêm)
                    if (minutes < 0) {
                        minutes += 24 * 60; // Cộng thêm 24 giờ
                    }
                    return BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
                }
                return BigDecimal.ZERO;
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return totalHours.multiply(hourlyRate).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Tính tổng giờ làm và số ca từ shift start/end time cho một nhân viên trong kỳ
     * Dùng để hiển thị thông tin chi tiết ở frontend
     */
    public ShiftWorkSummary calculateShiftWorkSummary(Integer userId, String period) {
        YearMonth yearMonth = YearMonth.parse(period);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        // Lấy thông tin staff để kiểm tra employmentType
        Optional<StaffProfile> staffProfileOpt = staffProfileRepository.findById(userId);
        final String staffEmploymentType = staffProfileOpt
            .map(StaffProfile::getEmploymentType)
            .orElse(null);

        // Lấy tất cả shift assignments đã hoàn thành trong kỳ
        List<ShiftAssignment> completedShifts = shiftAssignmentRepository
            .findByStaffUserIdAndShift_ShiftDateBetween(userId, startDate, endDate);

        // Lọc chỉ các shift có status = CHECKED_OUT và phù hợp với employmentType
        List<ShiftAssignment> checkedOutShifts = completedShifts.stream()
            .filter(sa -> {
                // Chỉ tính các ca đã CHECKED_OUT
                if (!"CHECKED_OUT".equals(sa.getStatus())) {
                    return false;
                }
                
                // Lọc theo employmentType của shift (nếu staff có employmentType)
                if (staffEmploymentType != null && !"ANY".equals(staffEmploymentType)) {
                    Shift shift = sa.getShift();
                    if (shift != null) {
                        String shiftEmploymentType = shift.getEmploymentType();
                        // Nếu shift không có employmentType, lấy từ template
                        if (shiftEmploymentType == null && shift.getTemplate() != null) {
                            shiftEmploymentType = shift.getTemplate().getEmploymentType();
                        }
                        // Nếu vẫn null, mặc định là "ANY"
                        if (shiftEmploymentType == null) {
                            shiftEmploymentType = "ANY";
                        }
                        // Chỉ tính nếu shift là "ANY" hoặc match với employmentType của staff
                        if (!"ANY".equals(shiftEmploymentType) && !shiftEmploymentType.equals(staffEmploymentType)) {
                            return false;
                        }
                    }
                }
                
                return true;
            })
            .toList();

        // Tính tổng giờ làm từ shift start/end time
        BigDecimal totalHours = checkedOutShifts.stream()
            .map(sa -> {
                Shift shift = sa.getShift();
                if (shift != null && shift.getStartTime() != null && shift.getEndTime() != null) {
                    // Tính từ shift start time đến shift end time
                    java.time.Duration duration = java.time.Duration.between(
                        shift.getStartTime(), 
                        shift.getEndTime()
                    );
                    long minutes = duration.toMinutes();
                    // Xử lý trường hợp end time < start time (ca qua đêm)
                    if (minutes < 0) {
                        minutes += 24 * 60; // Cộng thêm 24 giờ
                    }
                    return BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
                }
                return BigDecimal.ZERO;
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return ShiftWorkSummary.builder()
            .totalHours(totalHours.setScale(2, RoundingMode.HALF_UP))
            .totalShifts(checkedOutShifts.size())
            .build();
    }

    /**
     * DTO để trả về thông tin tổng giờ làm và số ca
     */
    @lombok.Data
    @lombok.Builder
    public static class ShiftWorkSummary {
        private BigDecimal totalHours;
        private Integer totalShifts;
    }

    /**
     * Tính tổng overtime hours trong kỳ
     */
    private BigDecimal calculateOvertimeHoursForPeriod(Integer userId, String period) {
        YearMonth yearMonth = YearMonth.parse(period);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        BigDecimal totalOvertime = BigDecimal.ZERO;

        // Tính OT cho từng ngày trong kỳ
        LocalDate currentDate = startDate;
        while (!currentDate.isAfter(endDate)) {
            BigDecimal dayOvertime = calculateOvertimeHoursForDay(userId, currentDate);
            totalOvertime = totalOvertime.add(dayOvertime);
            currentDate = currentDate.plusDays(1);
        }

        return totalOvertime.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Tính overtime hours trong một ngày
     */
    private BigDecimal calculateOvertimeHoursForDay(Integer userId, LocalDate date) {
        // Lấy tất cả ca đã hoàn thành trong ngày
        List<ShiftAssignment> completedShifts = shiftAssignmentRepository
            .findByStaffUserIdAndShift_ShiftDateBetween(userId, date, date);

        // Lọc chỉ các shift có status = CHECKED_OUT
        List<ShiftAssignment> checkedOutShifts = completedShifts.stream()
            .filter(sa -> "CHECKED_OUT".equals(sa.getStatus()))
            .toList();

        if (checkedOutShifts.isEmpty()) {
            return BigDecimal.ZERO;
        }

        // Tính tổng giờ làm thực tế trong ngày
        BigDecimal totalHoursInDay = checkedOutShifts.stream()
            .map(sa -> {
                if (sa.getActualHours() != null) {
                    return sa.getActualHours();
                } else {
                    // Tính từ check-in/check-out
                    if (sa.getCheckedInAt() != null && sa.getCheckedOutAt() != null) {
                        long minutes = java.time.Duration.between(sa.getCheckedInAt(), sa.getCheckedOutAt()).toMinutes();
                        return BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
                    }
                    return BigDecimal.ZERO;
                }
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Kiểm tra shift_type của TẤT CẢ ca trong ngày
        // Nếu có bất kỳ ca nào là WEEKEND hoặc HOLIDAY, thì toàn bộ giờ làm là OT
        boolean hasWeekendOrHolidayShift = checkedOutShifts.stream()
            .anyMatch(sa -> {
                Shift shift = sa.getShift();
                if (shift == null) return false;
                String shiftType = shift.getShiftType() != null ? shift.getShiftType() : "NORMAL";
                return "WEEKEND".equals(shiftType) || "HOLIDAY".equals(shiftType);
            });

        // Ngoài ra, kiểm tra ngày có phải lễ không (từ bảng holidays)
        boolean isHolidayDate = isHoliday(date);

        // Kiểm tra ngày có phải cuối tuần không
        java.time.DayOfWeek dayOfWeek = date.getDayOfWeek();
        boolean isWeekend = dayOfWeek == java.time.DayOfWeek.SATURDAY || dayOfWeek == java.time.DayOfWeek.SUNDAY;

        if (hasWeekendOrHolidayShift || isHolidayDate || isWeekend) {
            // Làm ngày nghỉ/lễ: Toàn bộ giờ làm là OT
            return totalHoursInDay;
        } else {
            // Ngày thường: OT = Tổng giờ làm - maxDailyHours (nếu > 0)
            BigDecimal maxDailyHours = getConfigValue("max_daily_hours", payrollProperties.getMaxDailyHours());
            BigDecimal overtime = totalHoursInDay.subtract(maxDailyHours);
            return overtime.compareTo(BigDecimal.ZERO) > 0 ? overtime : BigDecimal.ZERO;
        }
    }

    /**
     * Tính overtime pay với hệ số theo từng ngày
     */
    private BigDecimal calculateOvertimePay(Integer userId, String period, BigDecimal baseSalary, 
                                           BigDecimal hourlyRate, BigDecimal overtimeRate) {
        // Tính hourly rate
        BigDecimal calculatedHourlyRate;
        Optional<StaffProfile> staffProfileOpt = staffProfileRepository.findById(userId);
        
        if (staffProfileOpt.isPresent() && "HOURLY".equals(staffProfileOpt.get().getPayType())) {
            // Part-time: Dùng hourly_rate trực tiếp
            calculatedHourlyRate = hourlyRate;
        } else {
            // Full-time/Manager: Tính từ base_salary
            BigDecimal standardWorkingDays = getConfigValue("standard_working_days_per_month", 
                BigDecimal.valueOf(payrollProperties.getStandardWorkingDaysPerMonth()));
            BigDecimal standardWorkingHours = getConfigValue("standard_working_hours_per_day", 
                payrollProperties.getStandardWorkingHoursPerDay());
            BigDecimal standardHours = standardWorkingDays.multiply(standardWorkingHours);
            calculatedHourlyRate = baseSalary.divide(standardHours, 2, RoundingMode.HALF_UP);
        }

        // Tính OT pay cho từng ngày với hệ số khác nhau
        YearMonth yearMonth = YearMonth.parse(period);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        BigDecimal totalOvertimePay = BigDecimal.ZERO;
        LocalDate currentDate = startDate;
        
        while (!currentDate.isAfter(endDate)) {
            BigDecimal dayOvertimeHours = calculateOvertimeHoursForDay(userId, currentDate);
            
            if (dayOvertimeHours.compareTo(BigDecimal.ZERO) > 0) {
                // Lấy hệ số multiplier cho ngày này
                BigDecimal multiplier = getOvertimeMultiplier(currentDate, overtimeRate);
                
                // Tính OT pay cho ngày này
                BigDecimal dayOvertimePay = dayOvertimeHours
                    .multiply(calculatedHourlyRate)
                    .multiply(multiplier);
                
                totalOvertimePay = totalOvertimePay.add(dayOvertimePay);
            }
            
            currentDate = currentDate.plusDays(1);
        }

        return totalOvertimePay.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Tính tổng allowances
     */
    private BigDecimal calculateTotalAllowances(Integer userId, String period) {
        List<Allowance> allowances = allowanceRepository.findByUserIdAndPeriodAndStatus(
            userId, period, Allowance.AllowanceStatus.ACTIVE);
        
        return allowances.stream()
            .map(Allowance::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Tính tổng bonuses
     */
    private BigDecimal calculateTotalBonuses(Integer userId, String period) {
        List<Bonus> bonuses = bonusRepository.findByUserIdAndPeriodAndStatus(
            userId, period, Bonus.BonusStatus.APPROVED);
        
        return bonuses.stream()
            .map(Bonus::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Tính tổng penalties
     */
    private BigDecimal calculateTotalPenalties(Integer userId, String period) {
        List<Penalty> penalties = penaltyRepository.findByUserIdAndPeriodAndStatus(
            userId, period, Penalty.PenaltyStatus.APPROVED);
        
        return penalties.stream()
            .map(Penalty::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Tính khấu trừ bảo hiểm
     */
    private BigDecimal calculateInsuranceDeduction(BigDecimal insuranceSalary) {
        BigDecimal insuranceRate = getConfigValue("insurance_rate", payrollProperties.getInsuranceRate());
        return insuranceSalary.multiply(insuranceRate).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Tính thuế thu nhập cá nhân
     */
    private BigDecimal calculatePersonalIncomeTax(BigDecimal grossSalary, BigDecimal totalInsurance, 
                                                 Integer numberOfDependents) {
        // Taxable Income = Gross - Insurance - Personal Deduction - Dependent Deduction
        BigDecimal personalDeduction = getConfigValue("personal_deduction", payrollProperties.getPersonalDeduction());
        BigDecimal dependentDeduction = getConfigValue("dependent_deduction", payrollProperties.getDependentDeduction());
        BigDecimal deduction = personalDeduction
            .add(dependentDeduction.multiply(BigDecimal.valueOf(numberOfDependents)));
        
        BigDecimal taxableAmount = grossSalary.subtract(totalInsurance).subtract(deduction);
        
        if (taxableAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        // Tính thuế theo bậc từ config
        BigDecimal tax = BigDecimal.ZERO;
        
        BigDecimal bracket1Max = getConfigValue("tax_bracket_1_max", BigDecimal.valueOf(5000000));
        BigDecimal bracket1Rate = getConfigValue("tax_bracket_1_rate", BigDecimal.valueOf(0.05));
        BigDecimal bracket2Max = getConfigValue("tax_bracket_2_max", BigDecimal.valueOf(10000000));
        BigDecimal bracket2Rate = getConfigValue("tax_bracket_2_rate", BigDecimal.valueOf(0.10));
        BigDecimal bracket3Max = getConfigValue("tax_bracket_3_max", BigDecimal.valueOf(18000000));
        BigDecimal bracket3Rate = getConfigValue("tax_bracket_3_rate", BigDecimal.valueOf(0.15));
        BigDecimal bracket4Max = getConfigValue("tax_bracket_4_max", BigDecimal.valueOf(32000000));
        BigDecimal bracket4Rate = getConfigValue("tax_bracket_4_rate", BigDecimal.valueOf(0.20));
        BigDecimal bracket5Max = getConfigValue("tax_bracket_5_max", BigDecimal.valueOf(52000000));
        BigDecimal bracket5Rate = getConfigValue("tax_bracket_5_rate", BigDecimal.valueOf(0.25));
        BigDecimal bracket6Max = getConfigValue("tax_bracket_6_max", BigDecimal.valueOf(80000000));
        BigDecimal bracket6Rate = getConfigValue("tax_bracket_6_rate", BigDecimal.valueOf(0.30));
        BigDecimal bracket7Rate = getConfigValue("tax_bracket_7_rate", BigDecimal.valueOf(0.35));
        
        if (taxableAmount.compareTo(bracket1Max) <= 0) {
            // Bậc 1: 0-5tr → 5%
            tax = taxableAmount.multiply(bracket1Rate);
        } else if (taxableAmount.compareTo(bracket2Max) <= 0) {
            // Bậc 2: 5-10tr → 10%
            tax = bracket1Max.multiply(bracket1Rate) // Thuế bậc 1
                .add(taxableAmount.subtract(bracket1Max).multiply(bracket2Rate));
        } else if (taxableAmount.compareTo(bracket3Max) <= 0) {
            // Bậc 3: 10-18tr → 15%
            tax = bracket1Max.multiply(bracket1Rate)
                .add(bracket2Max.subtract(bracket1Max).multiply(bracket2Rate))
                .add(taxableAmount.subtract(bracket2Max).multiply(bracket3Rate));
        } else if (taxableAmount.compareTo(bracket4Max) <= 0) {
            // Bậc 4: 18-32tr → 20%
            tax = bracket1Max.multiply(bracket1Rate)
                .add(bracket2Max.subtract(bracket1Max).multiply(bracket2Rate))
                .add(bracket3Max.subtract(bracket2Max).multiply(bracket3Rate))
                .add(taxableAmount.subtract(bracket3Max).multiply(bracket4Rate));
        } else if (taxableAmount.compareTo(bracket5Max) <= 0) {
            // Bậc 5: 32-52tr → 25%
            tax = bracket1Max.multiply(bracket1Rate)
                .add(bracket2Max.subtract(bracket1Max).multiply(bracket2Rate))
                .add(bracket3Max.subtract(bracket2Max).multiply(bracket3Rate))
                .add(bracket4Max.subtract(bracket3Max).multiply(bracket4Rate))
                .add(taxableAmount.subtract(bracket4Max).multiply(bracket5Rate));
        } else if (taxableAmount.compareTo(bracket6Max) <= 0) {
            // Bậc 6: 52-80tr → 30%
            tax = bracket1Max.multiply(bracket1Rate)
                .add(bracket2Max.subtract(bracket1Max).multiply(bracket2Rate))
                .add(bracket3Max.subtract(bracket2Max).multiply(bracket3Rate))
                .add(bracket4Max.subtract(bracket3Max).multiply(bracket4Rate))
                .add(bracket5Max.subtract(bracket4Max).multiply(bracket5Rate))
                .add(taxableAmount.subtract(bracket5Max).multiply(bracket6Rate));
        } else {
            // Bậc 7: >80tr → 35%
            tax = bracket1Max.multiply(bracket1Rate)
                .add(bracket2Max.subtract(bracket1Max).multiply(bracket2Rate))
                .add(bracket3Max.subtract(bracket2Max).multiply(bracket3Rate))
                .add(bracket4Max.subtract(bracket3Max).multiply(bracket4Rate))
                .add(bracket5Max.subtract(bracket4Max).multiply(bracket5Rate))
                .add(bracket6Max.subtract(bracket5Max).multiply(bracket6Rate))
                .add(taxableAmount.subtract(bracket6Max).multiply(bracket7Rate));
        }
        
        return tax.setScale(0, RoundingMode.HALF_UP);
    }

    /**
     * Validate phân quyền
     * - Admin: Chỉ tính lương cho Manager (vì Manager không có Manager khác quản lý)
     * - Manager: Chỉ tính lương cho Staff trong branch của mình
     */
    private void validateAuthorization(Integer currentUserId, String currentUserRole, 
                                      Integer targetUserId, Payroll.UserRole targetUserRole, 
                                      Integer targetBranchId) {
        if ("ADMIN".equals(currentUserRole)) {
            // Admin chỉ có thể tính lương cho Manager
            // (Việc tính lương cho Staff là trách nhiệm của Manager)
            if (targetUserRole != Payroll.UserRole.MANAGER) {
                throw new AppException(ErrorCode.ACCESS_DENIED, 
                    "Admin chỉ có thể tính lương cho Manager. Việc tính lương cho Staff là trách nhiệm của Manager.");
            }
            return;
        }

        if ("MANAGER".equals(currentUserRole)) {
            // Manager chỉ quản lý Staff trong branch của mình
            if (targetUserRole != Payroll.UserRole.STAFF) {
                throw new AppException(ErrorCode.ACCESS_DENIED, 
                    "Manager chỉ có thể tính lương cho Staff trong branch của mình.");
            }
            
            ManagerProfile managerProfile = managerProfileRepository.findById(currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
            
            if (!managerProfile.getBranchId().equals(targetBranchId)) {
                throw new AppException(ErrorCode.ACCESS_DENIED, 
                    "Manager chỉ có thể tính lương cho Staff trong branch của mình.");
            }
        } else {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
    }

    /**
     * Kiểm tra user có phải Staff không
     */
    private boolean isStaff(Integer userId) {
        return staffProfileRepository.findById(userId).isPresent();
    }

    /**
     * Kiểm tra user có phải Manager không
     */
    private boolean isManager(Integer userId) {
        return managerProfileRepository.findById(userId).isPresent();
    }

    /**
     * Lấy danh sách payroll (có filter)
     */
    public List<PayrollResponse> getPayrolls(Integer userId, Integer branchId, String period, String status) {
        List<Payroll> payrolls;
        
        if (userId != null && period != null && status != null) {
            payrolls = payrollRepository.findByUserIdAndPeriodAndStatus(
                userId, period, Payroll.PayrollStatus.valueOf(status));
        } else if (userId != null && period != null) {
            payrolls = payrollRepository.findByUserIdAndPeriod(userId, period)
                .map(List::of)
                .orElse(List.of());
        } else if (branchId != null && period != null) {
            payrolls = payrollRepository.findByBranchIdAndPeriod(branchId, period);
        } else if (branchId != null && status != null) {
            payrolls = payrollRepository.findByBranchIdAndStatus(branchId, Payroll.PayrollStatus.valueOf(status));
        } else if (period != null && status != null) {
            // Filter by period and status only
            payrolls = payrollRepository.findByPeriodOrderByUserId(period)
                .stream()
                .filter(p -> p.getStatus().name().equals(status))
                .toList();
        } else if (period != null) {
            // Filter by period only
            payrolls = payrollRepository.findByPeriodOrderByUserId(period);
        } else if (status != null) {
            payrolls = payrollRepository.findByStatus(Payroll.PayrollStatus.valueOf(status));
        } else if (userId != null) {
            payrolls = payrollRepository.findByUserIdOrderByPeriodDesc(userId);
        } else if (branchId != null) {
            // Filter by branchId only
            payrolls = payrollRepository.findByBranchIdOrderByPeriodDesc(branchId);
        } else {
            payrolls = payrollRepository.findAll();
        }
        
        List<PayrollResponse> responses = payrolls.stream()
            .map(payrollMapper::toPayrollResponse)
            .toList();
        
        // Enrich with user and branch names
        enrichPayrollResponses(responses);
        
        return responses;
    }
    
    /**
     * Enrich payroll responses with user and branch names
     */
    private void enrichPayrollResponses(List<PayrollResponse> responses) {
        if (responses.isEmpty()) {
            return;
        }
        
        // Collect unique user IDs and branch IDs
        Set<Integer> userIds = responses.stream()
            .map(PayrollResponse::getUserId)
            .collect(Collectors.toSet());
        Set<Integer> branchIds = responses.stream()
            .map(PayrollResponse::getBranchId)
            .collect(Collectors.toSet());
        
        // Fetch users
        Map<Integer, String> userNames = new HashMap<>();
        for (Integer userId : userIds) {
            try {
                var userResponse = authClient.getUserById(userId);
                if (userResponse != null && userResponse.getResult() != null) {
                    userNames.put(userId, userResponse.getResult().getFullname());
                }
            } catch (Exception e) {
                log.warn("Failed to fetch user {}: {}", userId, e.getMessage());
                userNames.put(userId, "User #" + userId);
            }
        }
        
        // Fetch branches
        Map<Integer, String> branchNames = new HashMap<>();
        for (Integer branchId : branchIds) {
            try {
                var branchResponse = branchClient.getBranchById(branchId);
                if (branchResponse != null && branchResponse.getResult() != null) {
                    branchNames.put(branchId, branchResponse.getResult().getName());
                }
            } catch (Exception e) {
                log.warn("Failed to fetch branch {}: {}", branchId, e.getMessage());
                branchNames.put(branchId, "Branch #" + branchId);
            }
        }
        
        // Set names in responses
        for (PayrollResponse response : responses) {
            response.setUserName(userNames.getOrDefault(response.getUserId(), "User #" + response.getUserId()));
            response.setBranchName(branchNames.getOrDefault(response.getBranchId(), "Branch #" + response.getBranchId()));
        }
    }

    /**
     * Lấy chi tiết payroll
     */
    public PayrollResponse getPayrollById(Integer payrollId) {
        Payroll payroll = payrollRepository.findById(payrollId)
            .orElseThrow(() -> new AppException(ErrorCode.PAYROLL_NOT_FOUND));
        
        PayrollResponse response = payrollMapper.toPayrollResponse(payroll);
        enrichPayrollResponses(List.of(response));
        return response;
    }

    /**
     * Duyệt payroll
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public PayrollResponse approvePayroll(Integer payrollId, Integer currentUserId, String currentUserRole) {
        Payroll payroll = payrollRepository.findById(payrollId)
            .orElseThrow(() -> new AppException(ErrorCode.PAYROLL_NOT_FOUND));
        
        if (payroll.getStatus() != Payroll.PayrollStatus.DRAFT && 
            payroll.getStatus() != Payroll.PayrollStatus.REVIEW) {
            throw new AppException(ErrorCode.PAYROLL_ALREADY_APPROVED);
        }
        
        // Validate authorization
        validateAuthorization(currentUserId, currentUserRole, payroll.getUserId(), 
            payroll.getUserRole(), payroll.getBranchId());
        
        payroll.setStatus(Payroll.PayrollStatus.APPROVED);
        payroll.setApprovedBy(currentUserId);
        payroll.setApprovedAt(LocalDateTime.now());
        payroll.setUpdateAt(LocalDateTime.now());
        
        Payroll updated = payrollRepository.save(payroll);
        log.info("Approved payroll: payrollId={}", payrollId);
        
        return payrollMapper.toPayrollResponse(updated);
    }

    /**
     * Đánh dấu payroll đã thanh toán (Admin hoặc Manager)
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public PayrollResponse markPayrollAsPaid(Integer payrollId, Integer currentUserId, String currentUserRole) {
        Payroll payroll = payrollRepository.findById(payrollId)
            .orElseThrow(() -> new AppException(ErrorCode.PAYROLL_NOT_FOUND));
        
        if (payroll.getStatus() != Payroll.PayrollStatus.APPROVED) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                "Payroll must be APPROVED before marking as PAID");
        }
        
        // Validate authorization: Manager chỉ có thể mark as paid cho staff payrolls trong branch của họ
        validateAuthorization(currentUserId, currentUserRole, payroll.getUserId(), 
            payroll.getUserRole(), payroll.getBranchId());
        
        payroll.setStatus(Payroll.PayrollStatus.PAID);
        payroll.setPaidAt(LocalDateTime.now());
        payroll.setUpdateAt(LocalDateTime.now());
        
        Payroll updated = payrollRepository.save(payroll);
        log.info("Marked payroll as paid: payrollId={}", payrollId);
        
        return payrollMapper.toPayrollResponse(updated);
    }

    /**
     * Revert payroll status về trạng thái trước đó
     * - PAID -> APPROVED
     * - APPROVED -> DRAFT
     * Chỉ cho phép revert khi payroll period là tháng hiện tại hoặc 1 tháng trước
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public PayrollResponse revertPayrollStatus(Integer payrollId, Integer currentUserId, String currentUserRole) {
        Payroll payroll = payrollRepository.findById(payrollId)
            .orElseThrow(() -> new AppException(ErrorCode.PAYROLL_NOT_FOUND));
        
        // Kiểm tra status hiện tại
        if (payroll.getStatus() != Payroll.PayrollStatus.PAID && 
            payroll.getStatus() != Payroll.PayrollStatus.APPROVED) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                "Chỉ có thể revert payroll ở trạng thái PAID hoặc APPROVED");
        }
        
        // Kiểm tra period: chỉ cho phép revert nếu period là tháng hiện tại hoặc 1 tháng trước
        YearMonth currentMonth = YearMonth.now();
        YearMonth oneMonthAgo = currentMonth.minusMonths(1);
        YearMonth payrollPeriod = YearMonth.parse(payroll.getPeriod());
        
        if (!payrollPeriod.equals(currentMonth) && !payrollPeriod.equals(oneMonthAgo)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                "Chỉ có thể revert payroll của tháng hiện tại hoặc 1 tháng trước");
        }
        
        // Validate authorization
        validateAuthorization(currentUserId, currentUserRole, payroll.getUserId(), 
            payroll.getUserRole(), payroll.getBranchId());
        
        // Revert status
        if (payroll.getStatus() == Payroll.PayrollStatus.PAID) {
            // PAID -> APPROVED
            payroll.setStatus(Payroll.PayrollStatus.APPROVED);
            payroll.setPaidAt(null); // Clear paidAt
            log.info("Reverted payroll from PAID to APPROVED: payrollId={}", payrollId);
        } else if (payroll.getStatus() == Payroll.PayrollStatus.APPROVED) {
            // APPROVED -> DRAFT
            payroll.setStatus(Payroll.PayrollStatus.DRAFT);
            payroll.setApprovedBy(null); // Clear approvedBy
            payroll.setApprovedAt(null); // Clear approvedAt
            log.info("Reverted payroll from APPROVED to DRAFT: payrollId={}", payrollId);
        }
        
        payroll.setUpdateAt(LocalDateTime.now());
        
        Payroll updated = payrollRepository.save(payroll);
        return payrollMapper.toPayrollResponse(updated);
    }

    /**
     * Tính lương cho nhiều nhân viên (batch)
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public List<PayrollResponse> calculatePayrollBatch(List<Integer> userIds, String period, 
                                                       Integer currentUserId, String currentUserRole) {
        List<PayrollResponse> results = new java.util.ArrayList<>();
        
        for (Integer userId : userIds) {
            try {
                PayrollCalculationRequest request = PayrollCalculationRequest.builder()
                    .userId(userId)
                    .period(period)
                    .build();
                
                PayrollResponse payroll = calculatePayroll(request, currentUserId, currentUserRole);
                results.add(payroll);
            } catch (Exception e) {
                log.error("Failed to calculate payroll for userId={}, period={}: {}", 
                    userId, period, e.getMessage());
                // Continue with next user
            }
        }
        
        log.info("Calculated payroll batch: {} successful, {} total", results.size(), userIds.size());
        return results;
    }

    /**
     * Duyệt nhiều payroll cùng lúc (batch)
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public List<PayrollResponse> approvePayrollBatch(List<Integer> payrollIds, 
                                                     Integer currentUserId, String currentUserRole) {
        List<PayrollResponse> results = new java.util.ArrayList<>();
        
        for (Integer payrollId : payrollIds) {
            try {
                PayrollResponse payroll = approvePayroll(payrollId, currentUserId, currentUserRole);
                results.add(payroll);
            } catch (Exception e) {
                log.error("Failed to approve payroll payrollId={}: {}", payrollId, e.getMessage());
                // Continue with next payroll
            }
        }
        
        log.info("Approved payroll batch: {} successful, {} total", results.size(), payrollIds.size());
        return results;
    }

    /**
     * Đánh dấu nhiều payroll đã thanh toán (batch) - Admin hoặc Manager
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public List<PayrollResponse> markPayrollAsPaidBatch(List<Integer> payrollIds, 
                                                          Integer currentUserId, String currentUserRole) {
        List<PayrollResponse> results = new java.util.ArrayList<>();
        
        for (Integer payrollId : payrollIds) {
            try {
                PayrollResponse payroll = markPayrollAsPaid(payrollId, currentUserId, currentUserRole);
                results.add(payroll);
            } catch (Exception e) {
                log.error("Failed to mark payroll as paid payrollId={}: {}", payrollId, e.getMessage());
                // Continue with next payroll
            }
        }
        
        log.info("Marked payroll as paid batch: {} successful, {} total", results.size(), payrollIds.size());
        return results;
    }

    /**
     * Revert nhiều payroll status về trạng thái trước đó (batch)
     * - PAID -> APPROVED
     * - APPROVED -> DRAFT
     * Chỉ cho phép revert khi payroll period là tháng hiện tại hoặc 1 tháng trước
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public List<PayrollResponse> revertPayrollStatusBatch(List<Integer> payrollIds, 
                                                          Integer currentUserId, String currentUserRole) {
        List<PayrollResponse> results = new java.util.ArrayList<>();
        
        for (Integer payrollId : payrollIds) {
            try {
                PayrollResponse payroll = revertPayrollStatus(payrollId, currentUserId, currentUserRole);
                results.add(payroll);
            } catch (Exception e) {
                log.error("Failed to revert payroll status payrollId={}: {}", payrollId, e.getMessage());
                // Continue with next payroll
            }
        }
        
        log.info("Reverted payroll status batch: {} successful, {} total", results.size(), payrollIds.size());
        return results;
    }

    /**
     * Tính lại payroll (nếu có thay đổi)
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public PayrollResponse recalculatePayroll(Integer payrollId, Integer currentUserId, String currentUserRole) {
        Payroll existingPayroll = payrollRepository.findById(payrollId)
            .orElseThrow(() -> new AppException(ErrorCode.PAYROLL_NOT_FOUND));
        
        if (existingPayroll.getStatus() == Payroll.PayrollStatus.APPROVED || 
            existingPayroll.getStatus() == Payroll.PayrollStatus.PAID) {
            throw new AppException(ErrorCode.PAYROLL_ALREADY_APPROVED, 
                "Cannot recalculate payroll that is already APPROVED or PAID");
        }
        
        // Validate authorization
        validateAuthorization(currentUserId, currentUserRole, existingPayroll.getUserId(), 
            existingPayroll.getUserRole(), existingPayroll.getBranchId());
        
        // Xóa payroll cũ và tính lại
        payrollRepository.delete(existingPayroll);
        
        PayrollCalculationRequest request = PayrollCalculationRequest.builder()
            .userId(existingPayroll.getUserId())
            .period(existingPayroll.getPeriod())
            .build();
        
        return calculatePayroll(request, currentUserId, currentUserRole);
    }

    /**
     * Kiểm tra ngày có phải lễ không
     */
    private boolean isHoliday(LocalDate date) {
        return holidayRepository.findByHolidayDateAndIsActiveTrue(date).isPresent();
    }

    /**
     * Lấy hệ số OT multiplier theo ngày
     */
    private BigDecimal getOvertimeMultiplier(LocalDate date, BigDecimal baseRate) {
        // Kiểm tra ngày lễ
        if (isHoliday(date)) {
            BigDecimal holidayMultiplier = getConfigValue("holiday_overtime_multiplier", 
                payrollProperties.getHolidayOvertimeMultiplier());
            return baseRate.multiply(holidayMultiplier);
        }
        
        // Kiểm tra cuối tuần
        java.time.DayOfWeek dayOfWeek = date.getDayOfWeek();
        if (dayOfWeek == java.time.DayOfWeek.SATURDAY || dayOfWeek == java.time.DayOfWeek.SUNDAY) {
            BigDecimal weekendMultiplier = getConfigValue("weekend_overtime_multiplier", 
                payrollProperties.getWeekendOvertimeMultiplier());
            return baseRate.multiply(weekendMultiplier);
        }
        
        // Ngày thường
        return baseRate; // defaultOvertimeRate (1.5x)
    }

    /**
     * Helper method để lấy config value từ database, fallback về PayrollProperties nếu không tìm thấy
     */
    private BigDecimal getConfigValue(String configKey, BigDecimal defaultValue) {
        try {
            return payrollConfigurationService.getConfigValue(configKey);
        } catch (Exception e) {
            log.warn("Failed to get config {} from database, using default value: {}", configKey, defaultValue, e);
            return defaultValue;
        }
    }
}

