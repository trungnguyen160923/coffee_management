package com.service.catalog.dto.response;


import java.time.LocalDateTime;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CategoryResponse {
    Integer categoryId;
    String name;
    String description;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
