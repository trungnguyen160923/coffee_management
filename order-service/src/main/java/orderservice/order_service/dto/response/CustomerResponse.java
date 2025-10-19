package orderservice.order_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

import lombok.AccessLevel;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CustomerResponse {
    private Integer customerId;
    private String fullname;
    private String email;
    private String phoneNumber;
    private String avatarUrl;
    private LocalDateTime createAt;
    private LocalDateTime updateAt;
}
