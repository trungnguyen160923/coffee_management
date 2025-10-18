package com.service.catalog.dto.request.stock;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommitReservationRequest {
    private String holdId;
    private Integer orderId;
}
