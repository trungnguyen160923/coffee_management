package orderservice.order_service.dto.request;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateBranchClosureGroupRequest {

    /**
     * List of closure IDs to update (all closures in the same group)
     */
    @NotNull(message = "Closure IDs cannot be null")
    List<Integer> closureIds;

    /**
     * New branch IDs. If empty or null, applies to all branches (global).
     * If provided, creates closures for each branch ID.
     */
    List<Integer> branchIds;

    @FutureOrPresent(message = "Start date cannot be in the past")
    LocalDate startDate;

    @FutureOrPresent(message = "End date cannot be in the past")
    LocalDate endDate;

    @Size(max = 255, message = "Reason must not exceed 255 characters")
    String reason;
}

