package orderservice.order_service.mapper;

import org.mapstruct.Mapper;
import orderservice.order_service.dto.response.BranchResponse;
import orderservice.order_service.entity.Branch;

@Mapper(componentModel = "spring")
public interface BranchMapper {
    BranchResponse toBranchResponse(Branch branch);
}
