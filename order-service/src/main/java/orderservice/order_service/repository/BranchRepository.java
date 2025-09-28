package orderservice.order_service.repository;

import orderservice.order_service.entity.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BranchRepository extends JpaRepository<Branch, Integer> {

    Optional<Branch> findByName(String name);

    List<Branch> findByManagerUserId(Integer managerUserId);

    boolean existsByName(String name);

    List<Branch> findByNameContainingIgnoreCase(String name);
}
