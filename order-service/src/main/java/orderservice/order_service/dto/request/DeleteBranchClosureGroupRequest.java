package orderservice.order_service.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DeleteBranchClosureGroupRequest {

    /**
     * List of closure IDs to delete (all closures in the same group)
     */
    @NotNull(message = "Closure IDs cannot be null")
    List<Integer> closureIds;
}

