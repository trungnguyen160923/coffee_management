package orderservice.order_service.client;

import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.dto.response.ProductDetailResponse;
import orderservice.order_service.dto.response.ProductResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.Map;

@FeignClient(name = "catalog-service", url = "http://localhost:8004", path = "/catalogs")
public interface CatalogServiceClient {

    @GetMapping("/products")
    ApiResponse<List<ProductResponse>> getAllProducts();

    @GetMapping("/products/{productId}")
    ApiResponse<ProductResponse> getProductById(@PathVariable("productId") Integer productId);

    @GetMapping("/products/detail/{productDetailId}")
    ApiResponse<ProductDetailResponse> getProductDetailById(@PathVariable("productDetailId") Integer productDetailId);

    @PutMapping("/stocks/update-order-id")
    ApiResponse<Map<String, Object>> updateReservationOrderId(@RequestBody Map<String, Object> request);

    @PutMapping("/stocks/update-order-id-by-cart")
    ApiResponse<Map<String, Object>> updateOrderIdForReservationsByCartOrGuest(@RequestBody Map<String, Object> request);
}
