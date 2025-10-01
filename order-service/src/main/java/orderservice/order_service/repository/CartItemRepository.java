package orderservice.order_service.repository;

import orderservice.order_service.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Integer> {

    List<CartItem> findByCartCartId(Integer cartId);

    @Query("SELECT ci FROM CartItem ci WHERE ci.cart.userId = :userId")
    List<CartItem> findByUserId(@Param("userId") Integer userId);

    @Query("SELECT ci FROM CartItem ci WHERE ci.cart.userId = :userId AND ci.productId = :productId AND ci.productDetailId = :productDetailId")
    Optional<CartItem> findByUserIdAndProductAndDetail(@Param("userId") Integer userId,
            @Param("productId") Integer productId,
            @Param("productDetailId") Integer productDetailId);

    @Query("SELECT ci FROM CartItem ci WHERE ci.cart.userId = :userId AND ci.productId = :productId")
    Optional<CartItem> findByUserIdAndProduct(@Param("userId") Integer userId,
            @Param("productId") Integer productId);

    void deleteByCartUserId(Integer userId);
}
