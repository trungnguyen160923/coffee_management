package com.smartcafe.smart_cafe.repository;

import com.smartcafe.smart_cafe.model.Order;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Integer> {
    List<Order> findByUserIdOrderByCreatedAtDesc(Integer userId);
}
