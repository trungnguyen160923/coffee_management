package orderservice.order_service.repository;

import orderservice.order_service.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Integer> {

    List<Order> findByCustomerIdOrderByOrderDateDesc(Integer customerId);

    List<Order> findByBranchIdOrderByOrderDateDesc(Integer branchId);

    List<Order> findByStatusOrderByOrderDateDesc(String status);

    @Query("SELECT o FROM Order o WHERE o.customerId = :customerId AND o.status = :status ORDER BY o.orderDate DESC")
    List<Order> findByCustomerIdAndStatusOrderByOrderDateDesc(@Param("customerId") Integer customerId,
            @Param("status") String status);
}
