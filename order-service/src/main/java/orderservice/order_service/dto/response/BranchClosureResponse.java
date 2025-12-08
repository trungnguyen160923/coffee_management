package orderservice.order_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BranchClosureResponse {

    Integer id;
    Integer branchId; // null = all branches
    Integer userId;   // creator (admin/manager), nullable
    LocalDate startDate;
    LocalDate endDate;
    String reason;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}


