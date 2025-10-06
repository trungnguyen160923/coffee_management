package orderservice.order_service.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.service.EmailService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/email")
@RequiredArgsConstructor
@Slf4j
public class EmailController {

    private final EmailService emailService;

    @PostMapping("/send-order-confirmation")
    public ResponseEntity<ApiResponse<String>> sendOrderConfirmation(@RequestBody OrderConfirmationRequest request) {
        try {
            log.info("Sending order confirmation email to: {}", request.getEmail());

            // Convert request to service parameters
            List<EmailService.OrderItemInfo> orderItems = request.getOrderItems().stream()
                    .map(item -> new EmailService.OrderItemInfo(
                            item.getProductName(),
                            item.getQuantity(),
                            item.getTotalPrice()))
                    .toList();

            emailService.sendOrderConfirmationEmail(
                    request.getEmail(),
                    request.getCustomerName(),
                    request.getOrderId(),
                    orderItems,
                    request.getTotalAmount(),
                    request.getDeliveryAddress(),
                    request.getPaymentMethod(),
                    LocalDateTime.now());

            ApiResponse<String> response = ApiResponse.<String>builder()
                    .code(200)
                    .message("Order confirmation email sent successfully")
                    .result("Email sent")
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to send order confirmation email", e);
            ApiResponse<String> response = ApiResponse.<String>builder()
                    .code(500)
                    .message("Failed to send email: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    public static class OrderConfirmationRequest {
        private String email;
        private String customerName;
        private Integer orderId;
        private List<OrderItemRequest> orderItems;
        private BigDecimal totalAmount;
        private String deliveryAddress;
        private String paymentMethod;
        private String orderDate;

        // Getters and setters
        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getCustomerName() {
            return customerName;
        }

        public void setCustomerName(String customerName) {
            this.customerName = customerName;
        }

        public Integer getOrderId() {
            return orderId;
        }

        public void setOrderId(Integer orderId) {
            this.orderId = orderId;
        }

        public List<OrderItemRequest> getOrderItems() {
            return orderItems;
        }

        public void setOrderItems(List<OrderItemRequest> orderItems) {
            this.orderItems = orderItems;
        }

        public BigDecimal getTotalAmount() {
            return totalAmount;
        }

        public void setTotalAmount(BigDecimal totalAmount) {
            this.totalAmount = totalAmount;
        }

        public String getDeliveryAddress() {
            return deliveryAddress;
        }

        public void setDeliveryAddress(String deliveryAddress) {
            this.deliveryAddress = deliveryAddress;
        }

        public String getPaymentMethod() {
            return paymentMethod;
        }

        public void setPaymentMethod(String paymentMethod) {
            this.paymentMethod = paymentMethod;
        }

        public String getOrderDate() {
            return orderDate;
        }

        public void setOrderDate(String orderDate) {
            this.orderDate = orderDate;
        }

        public static class OrderItemRequest {
            private String productName;
            private Integer quantity;
            private BigDecimal totalPrice;

            // Getters and setters
            public String getProductName() {
                return productName;
            }

            public void setProductName(String productName) {
                this.productName = productName;
            }

            public Integer getQuantity() {
                return quantity;
            }

            public void setQuantity(Integer quantity) {
                this.quantity = quantity;
            }

            public BigDecimal getTotalPrice() {
                return totalPrice;
            }

            public void setTotalPrice(BigDecimal totalPrice) {
                this.totalPrice = totalPrice;
            }
        }
    }
}
