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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateBranchClosureRequest {

    /**
     * Nullable: if null, this closure applies to all branches.
     */
    Integer branchId;

    @NotNull(message = "Start date is required")
    @FutureOrPresent(message = "Start date cannot be in the past")
    LocalDate startDate;

    @FutureOrPresent(message = "End date cannot be in the past")
    LocalDate endDate;

    @Size(max = 255, message = "Reason must not exceed 255 characters")
    String reason;
}


