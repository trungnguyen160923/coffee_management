package orderservice.order_service.service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.client.CatalogServiceClient;
import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.dto.response.ReservationResponse;
import orderservice.order_service.entity.Order;
import orderservice.order_service.entity.Reservation;
import orderservice.order_service.repository.OrderRepository;
import orderservice.order_service.repository.ReservationRepository;

/**
 * Scheduler tự động hủy các đơn hàng / đặt bàn ở trạng thái PENDING quá 1 tiếng.
 * Và tự động hủy các đơn hàng không còn reservation (đã bị xóa/hết hạn).
 */
@Component
@RequiredArgsConstructor
@Slf4j
@org.springframework.transaction.annotation.Transactional
public class AutoCancellationScheduler {

    private final OrderRepository orderRepository;
    private final ReservationRepository reservationRepository;
    private final OrderService orderService;
    private final ReservationService reservationService;
    private final CatalogServiceClient catalogServiceClient;

    private static final long MAX_PENDING_MINUTES = 60L;

    /**
     * Chạy định kỳ để auto-cancel các đơn hàng PENDING/PREPARING/CREATED quá 1 tiếng.
     * Và tự động hủy các đơn hàng không còn reservation (đã bị xóa/hết hạn).
     * Mặc định 5 phút chạy một lần, có thể override qua cấu hình.
     */
    @Scheduled(fixedDelayString = "${app.orders.auto-cancel-interval-ms:300000}")
    public void autoCancelStalePendingOrders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff = now.minus(MAX_PENDING_MINUTES, ChronoUnit.MINUTES);

        // 1. Cancel các order PENDING/PREPARING/CREATED quá 1 tiếng
        List<Order> staleOrders = orderRepository.findByStatusIn(List.of("PENDING", "PREPARING", "CREATED"))
                .stream()
                .filter(order -> order.getCreateAt().isBefore(cutoff))
                .toList();
        
        if (!staleOrders.isEmpty()) {
            log.info("[AutoCancellationScheduler] Found {} stale PENDING/PREPARING/CREATED orders to cancel (cutoff: {})",
                    staleOrders.size(), cutoff);

            staleOrders.forEach(order -> {
                try {
                    log.info("[AutoCancellationScheduler] Auto-cancelling orderId={} (status={}, createdAt={})",
                            order.getOrderId(), order.getStatus(), order.getCreateAt());
                    // Sử dụng cùng logic cancel của service để đảm bảo release reservations + publish events
                    orderService.cancelOrderByCustomer(order.getOrderId());
                } catch (Exception e) {
                    log.error("[AutoCancellationScheduler] Failed to auto-cancel orderId={}", order.getOrderId(), e);
                }
            });
        }

        // 2. Cancel các order PENDING/PREPARING/CREATED không còn reservation (đã bị xóa/hết hạn)
        // Chỉ kiểm tra các order chưa quá 1 tiếng (để tránh trùng với bước 1)
        List<Order> ordersToCheckReservation = orderRepository.findByStatusIn(List.of("PENDING", "PREPARING", "CREATED"))
                .stream()
                .filter(order -> order.getCreateAt().isAfter(cutoff)) // Chỉ kiểm tra order mới (chưa quá 1 tiếng)
                .toList();
        
        if (!ordersToCheckReservation.isEmpty()) {
            log.info("[AutoCancellationScheduler] Checking {} recent PENDING/PREPARING/CREATED orders for missing reservations",
                    ordersToCheckReservation.size());

            ordersToCheckReservation.forEach(order -> {
                try {
                    // Kiểm tra xem order có reservation không
                    ApiResponse<Map<String, Object>> holdIdResponse = catalogServiceClient.getHoldIdByOrderId(order.getOrderId());
                    if (holdIdResponse == null || holdIdResponse.getResult() == null || 
                        holdIdResponse.getResult().get("holdId") == null) {
                        // Không tìm thấy reservation → tự động cancel order
                        log.warn("[AutoCancellationScheduler] Order {} has no active reservation. Auto-cancelling order.",
                                order.getOrderId());
                        orderService.cancelOrderByCustomer(order.getOrderId());
                    }
                } catch (FeignException.NotFound e) {
                    // Reservation không tồn tại → tự động cancel order
                    log.warn("[AutoCancellationScheduler] Order {} reservation not found. Auto-cancelling order.",
                            order.getOrderId());
                    try {
                        orderService.cancelOrderByCustomer(order.getOrderId());
                    } catch (Exception cancelEx) {
                        log.error("[AutoCancellationScheduler] Failed to auto-cancel orderId={} due to missing reservation",
                                order.getOrderId(), cancelEx);
                    }
                } catch (Exception e) {
                    log.error("[AutoCancellationScheduler] Error checking reservation for orderId={}: {}",
                            order.getOrderId(), e.getMessage(), e);
                    // Không throw exception để không ảnh hưởng đến các order khác
                }
            });
        }
    }

    /**
     * Chạy định kỳ để auto-cancel các đặt bàn PENDING quá 1 tiếng.
     * Mặc định 5 phút chạy một lần, có thể override qua cấu hình.
     */
    @Scheduled(fixedDelayString = "${app.reservations.auto-cancel-interval-ms:300000}")
    public void autoCancelStalePendingReservations() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff = now.minus(MAX_PENDING_MINUTES, ChronoUnit.MINUTES);

        List<Reservation> staleReservations =
                reservationRepository.findByStatusAndReservedAtBefore("PENDING", cutoff);
        if (staleReservations.isEmpty()) {
            return;
        }

        log.info("[AutoCancellationScheduler] Found {} stale PENDING reservations to cancel (cutoff: {})",
                staleReservations.size(), cutoff);

        staleReservations.forEach(reservation -> {
            try {
                log.info("[AutoCancellationScheduler] Auto-cancelling reservationId={} (reservedAt={}, currentStatus={})",
                        reservation.getReservationId(), reservation.getReservedAt(), reservation.getStatus());
                
                // Dùng updateReservationStatus để giữ nguyên luồng publish event
                ReservationResponse result = reservationService.updateReservationStatus(reservation.getReservationId(), "CANCELLED");
                
                // Verify status was updated
                if (result != null && "CANCELLED".equals(result.getStatus())) {
                    log.info("[AutoCancellationScheduler] ✅ Successfully cancelled reservationId={}, newStatus={}",
                            reservation.getReservationId(), result.getStatus());
                } else {
                    log.warn("[AutoCancellationScheduler] ⚠️ Status update may have failed for reservationId={}. Result: {}",
                            reservation.getReservationId(), result);
                }
            } catch (Exception e) {
                log.error("[AutoCancellationScheduler] ❌ Failed to auto-cancel reservationId={}. Error: {}",
                        reservation.getReservationId(), e.getMessage(), e);
            }
        });
    }
}


