package com.smartcafe.smart_cafe.repository;

import com.smartcafe.smart_cafe.model.Booking;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingRepository extends JpaRepository<Booking, Integer> {
    List<Booking> findByUserIdOrderByCreatedAtDesc(Integer userId);
}
