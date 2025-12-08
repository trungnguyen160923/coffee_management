package orderservice.order_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ManagerProfileResponse {
    Integer userId;
    BranchResponse branch;
    String identityCard;
    LocalDate hireDate;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}

