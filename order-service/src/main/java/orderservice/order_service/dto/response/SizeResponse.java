package orderservice.order_service.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonIgnoreProperties(ignoreUnknown = true)
public class SizeResponse {
    Integer sizeId;
    String name;
    String description;
    Boolean active;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
