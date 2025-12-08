package com.service.profile.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchOperationResponse {
    private int successCount;
    private int skippedCount;
    private List<ShiftResponse> updatedShifts;
}

