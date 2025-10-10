package com.service.profile.repository;

import com.service.profile.entity.Address;
import com.service.profile.entity.CustomerAddress;
import com.service.profile.entity.CustomerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerAddressRepository extends JpaRepository<CustomerAddress, Integer> {
    boolean existsByAddressAndCustomer(Address address, CustomerProfile customer);

    List<CustomerAddress> findByCustomer(CustomerProfile customer);

    Optional<CustomerAddress> findByAddressAndCustomer(Address address, CustomerProfile customer);
}
