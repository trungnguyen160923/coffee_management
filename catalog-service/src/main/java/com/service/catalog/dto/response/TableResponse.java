package com.service.catalog.dto.response;

import com.service.catalog.entity.TableEntity;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TableResponse {

    Integer tableId;
    Integer branchId;
    String label;
    Integer capacity;
    TableEntity.TableStatus status;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
