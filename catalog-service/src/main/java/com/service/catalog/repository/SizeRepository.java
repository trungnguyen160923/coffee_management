package com.service.catalog.repository;

import com.service.catalog.entity.Size;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SizeRepository extends JpaRepository<Size, Integer> {
    
    boolean existsByNameAndSizeIdNot(String name, Integer sizeId);
}
