package orderservice.order_service.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ManagerProfileResponse {
    Integer userId;
    BranchResponse branch;
    String identityCard;
    LocalDate hireDate;
    BigDecimal baseSalary;
    BigDecimal insuranceSalary;
    BigDecimal overtimeRate;
    Integer numberOfDependents;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}

