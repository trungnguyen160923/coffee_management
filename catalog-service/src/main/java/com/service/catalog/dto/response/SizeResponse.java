package com.service.catalog.dto.response;

import java.time.LocalDateTime;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SizeResponse {
    Integer sizeId;
    String name;
    String description;
    Boolean active;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
