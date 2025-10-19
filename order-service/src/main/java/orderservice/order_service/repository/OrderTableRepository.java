package orderservice.order_service.repository;

import orderservice.order_service.entity.OrderTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderTableRepository extends JpaRepository<OrderTable, Integer> {

    List<OrderTable> findByOrderId(Integer orderId);

    List<OrderTable> findByTableId(Integer tableId);

    void deleteByOrderId(Integer orderId);
}
