package orderservice.order_service.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonIgnoreProperties(ignoreUnknown = true)
public class StaffProfileResponse {
    Integer userId;
    BranchResponse branch;
    String identityCard;
    java.time.LocalDate hireDate;
    String employmentType; // FULL_TIME / PART_TIME / CASUAL
    String payType;        // MONTHLY / HOURLY
    java.math.BigDecimal baseSalary;
    java.math.BigDecimal hourlyRate;
    java.math.BigDecimal insuranceSalary;
    java.math.BigDecimal overtimeRate;
    Integer numberOfDependents;
    java.time.LocalDateTime createAt;
    java.time.LocalDateTime updateAt;
    
    // Staff business roles & proficiency
    List<Integer> staffBusinessRoleIds;
    String proficiencyLevel;
}

