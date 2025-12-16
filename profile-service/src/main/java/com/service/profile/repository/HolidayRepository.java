package com.service.profile.repository;

import com.service.profile.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, Integer> {
    
    // Kiểm tra ngày có phải lễ không
    Optional<Holiday> findByHolidayDateAndIsActiveTrue(LocalDate date);
    
    // Lấy tất cả ngày lễ active
    java.util.List<Holiday> findByIsActiveTrue();
}

