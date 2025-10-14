package com.service.catalog.dto.request.table;

import com.service.catalog.entity.TableEntity;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TableSearchRequest {

    @Builder.Default
    Integer page = 0;

    @Builder.Default
    Integer size = 10;

    Integer branchId;

    String search;

    TableEntity.TableStatus status;

    String sortBy;

    String sortDirection;
}
