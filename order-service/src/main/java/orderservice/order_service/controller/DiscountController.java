package orderservice.order_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.dto.request.ApplyDiscountRequest;
import orderservice.order_service.dto.request.CreateDiscountRequest;
import orderservice.order_service.dto.request.UpdateDiscountRequest;
import orderservice.order_service.dto.response.ApiResponse;
import orderservice.order_service.dto.response.DiscountApplicationResponse;
import orderservice.order_service.dto.response.DiscountPageResponse;
import orderservice.order_service.dto.response.DiscountResponse;
import orderservice.order_service.service.DiscountService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/discounts")
@RequiredArgsConstructor
@Slf4j
public class DiscountController {

        private final DiscountService discountService;

        @PostMapping
        @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
        public ResponseEntity<ApiResponse<DiscountResponse>> createDiscount(
                        @Valid @RequestBody CreateDiscountRequest request) {
                log.info("Creating discount with code: {}", request.getCode());

                DiscountResponse response = discountService.createDiscount(request);

                return ResponseEntity.status(HttpStatus.CREATED)
                                .body(ApiResponse.<DiscountResponse>builder()
                                                .code(2000)
                                                .message("Tạo mã giảm giá thành công")
                                                .result(response)
                                                .build());
        }

        @PutMapping("/{discountId}")
        @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
        public ResponseEntity<ApiResponse<DiscountResponse>> updateDiscount(
                        @PathVariable Integer discountId,
                        @Valid @RequestBody UpdateDiscountRequest request) {
                log.info("Updating discount with ID: {}", discountId);

                DiscountResponse response = discountService.updateDiscount(discountId, request);

                return ResponseEntity.ok(ApiResponse.<DiscountResponse>builder()
                                .code(2000)
                                .message("Cập nhật mã giảm giá thành công")
                                .result(response)
                                .build());
        }

        @DeleteMapping("/{discountId}")
        @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
        public ResponseEntity<ApiResponse<Void>> deleteDiscount(@PathVariable Integer discountId) {
                log.info("Deleting discount with ID: {}", discountId);

                discountService.deleteDiscount(discountId);

                return ResponseEntity.ok(ApiResponse.<Void>builder()
                                .code(2000)
                                .message("Xóa mã giảm giá thành công")
                                .build());
        }

        @GetMapping("/{discountId}")
        @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
        public ResponseEntity<ApiResponse<DiscountResponse>> getDiscountById(@PathVariable Integer discountId) {
                log.info("Getting discount by ID: {}", discountId);

                DiscountResponse response = discountService.getDiscountById(discountId);

                return ResponseEntity.ok(ApiResponse.<DiscountResponse>builder()
                                .code(2000)
                                .message("Lấy thông tin mã giảm giá thành công")
                                .result(response)
                                .build());
        }

        @GetMapping("/code/{code}")
        @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
        public ResponseEntity<ApiResponse<DiscountResponse>> getDiscountByCode(@PathVariable String code) {
                log.info("Getting discount by code: {}", code);

                DiscountResponse response = discountService.getDiscountByCode(code);

                return ResponseEntity.ok(ApiResponse.<DiscountResponse>builder()
                                .code(2000)
                                .message("Lấy thông tin mã giảm giá thành công")
                                .result(response)
                                .build());
        }

        @GetMapping
        @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
        public ResponseEntity<ApiResponse<DiscountPageResponse>> getAllDiscounts(
                        @RequestParam(required = false) Integer branchId,
                        @RequestParam(required = false) String keyword,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size,
                        @RequestParam(defaultValue = "createAt") String sortBy,
                        @RequestParam(defaultValue = "desc") String sortDir) {
                log.info("Getting all discounts for branch: {}, keyword: {}, page: {}, size: {}", branchId, keyword,
                                page,
                                size);

                DiscountPageResponse response = discountService.getAllDiscounts(branchId, keyword, page, size, sortBy,
                                sortDir);

                return ResponseEntity.ok(ApiResponse.<DiscountPageResponse>builder()
                                .code(2000)
                                .message("Lấy danh sách mã giảm giá thành công")
                                .result(response)
                                .build());
        }

        @GetMapping("/active")
        @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
        public ResponseEntity<ApiResponse<List<DiscountResponse>>> getActiveDiscounts(
                        @RequestParam(required = false) Integer branchId) {
                log.info("Getting active discounts for branch: {}", branchId);

                List<DiscountResponse> response = discountService.getActiveDiscounts(branchId);

                return ResponseEntity.ok(ApiResponse.<List<DiscountResponse>>builder()
                                .code(2000)
                                .message("Lấy danh sách mã giảm giá đang hoạt động thành công")
                                .result(response)
                                .build());
        }

        @GetMapping("/available")
        public ResponseEntity<ApiResponse<List<DiscountResponse>>> getAvailableDiscounts(
                        @RequestParam(required = false) Integer branchId) {
                log.info("Getting available discounts for branch: {}", branchId);

                List<DiscountResponse> response = discountService.getActiveDiscounts(branchId);

                return ResponseEntity.ok(ApiResponse.<List<DiscountResponse>>builder()
                                .code(2000)
                                .message("Lấy danh sách mã giảm giá có sẵn thành công")
                                .result(response)
                                .build());
        }

        @PostMapping("/validate")
        public ResponseEntity<ApiResponse<DiscountApplicationResponse>> validateDiscount(
                        @Valid @RequestBody ApplyDiscountRequest request) {
                log.info("Validating discount with code: {} for order amount: {}", request.getDiscountCode(),
                                request.getOrderAmount());

                DiscountApplicationResponse response = discountService.applyDiscount(request);

                return ResponseEntity.ok(ApiResponse.<DiscountApplicationResponse>builder()
                                .code(2000)
                                .message("Kiểm tra mã giảm giá thành công")
                                .result(response)
                                .build());
        }

        @PostMapping("/apply")
        public ResponseEntity<ApiResponse<DiscountApplicationResponse>> applyDiscount(
                        @Valid @RequestBody ApplyDiscountRequest request) {
                log.info("Applying discount with code: {} for order amount: {}", request.getDiscountCode(),
                                request.getOrderAmount());

                DiscountApplicationResponse response = discountService.applyDiscount(request);

                return ResponseEntity.ok(ApiResponse.<DiscountApplicationResponse>builder()
                                .code(2000)
                                .message("Áp dụng mã giảm giá thành công")
                                .result(response)
                                .build());
        }

        @PostMapping("/{discountCode}/use")
        @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
        public ResponseEntity<ApiResponse<Void>> useDiscount(@PathVariable String discountCode) {
                log.info("Using discount with code: {}", discountCode);

                discountService.useDiscount(discountCode);

                return ResponseEntity.ok(ApiResponse.<Void>builder()
                                .code(2000)
                                .message("Sử dụng mã giảm giá thành công")
                                .build());
        }
}
