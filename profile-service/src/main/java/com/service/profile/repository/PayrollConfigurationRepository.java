package com.service.profile.repository;

import com.service.profile.entity.PayrollConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PayrollConfigurationRepository extends JpaRepository<PayrollConfiguration, Integer> {
    
    Optional<PayrollConfiguration> findByConfigKey(String configKey);
    
    List<PayrollConfiguration> findByIsActiveTrue();
    
    List<PayrollConfiguration> findByIsActive(Boolean isActive);
    
    boolean existsByConfigKey(String configKey);
}

