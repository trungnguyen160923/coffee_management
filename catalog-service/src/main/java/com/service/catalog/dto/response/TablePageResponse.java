package com.service.catalog.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TablePageResponse {

    List<TableResponse> content;
    Integer page;
    Integer size;
    Long totalElements;
    Integer totalPages;
    Boolean first;
    Boolean last;
}
