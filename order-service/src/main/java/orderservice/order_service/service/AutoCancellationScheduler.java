package orderservice.order_service.service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.entity.Order;
import orderservice.order_service.entity.Reservation;
import orderservice.order_service.repository.OrderRepository;
import orderservice.order_service.repository.ReservationRepository;

/**
 * Scheduler tự động hủy các đơn hàng / đặt bàn ở trạng thái PENDING quá 1 tiếng.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AutoCancellationScheduler {

    private final OrderRepository orderRepository;
    private final ReservationRepository reservationRepository;
    private final OrderService orderService;
    private final ReservationService reservationService;

    private static final long MAX_PENDING_MINUTES = 60L;

    /**
     * Chạy định kỳ để auto-cancel các đơn hàng PENDING quá 1 tiếng.
     * Mặc định 5 phút chạy một lần, có thể override qua cấu hình.
     */
    @Scheduled(fixedDelayString = "${app.orders.auto-cancel-interval-ms:300000}")
    public void autoCancelStalePendingOrders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff = now.minus(MAX_PENDING_MINUTES, ChronoUnit.MINUTES);

        List<Order> staleOrders = orderRepository.findByStatusAndCreateAtBefore("PENDING", cutoff);
        if (staleOrders.isEmpty()) {
            return;
        }

        log.info("[AutoCancellationScheduler] Found {} stale PENDING orders to cancel (cutoff: {})",
                staleOrders.size(), cutoff);

        staleOrders.forEach(order -> {
            try {
                log.info("[AutoCancellationScheduler] Auto-cancelling orderId={} (createdAt={})",
                        order.getOrderId(), order.getCreateAt());
                // Sử dụng cùng logic cancel của service để đảm bảo release reservations + publish events
                orderService.cancelOrderByCustomer(order.getOrderId());
            } catch (Exception e) {
                log.error("[AutoCancellationScheduler] Failed to auto-cancel orderId={}", order.getOrderId(), e);
            }
        });
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
                log.info("[AutoCancellationScheduler] Auto-cancelling reservationId={} (reservedAt={})",
                        reservation.getReservationId(), reservation.getReservedAt());
                // Dùng updateReservationStatus để giữ nguyên luồng publish event
                reservationService.updateReservationStatus(reservation.getReservationId(), "CANCELLED");
            } catch (Exception e) {
                log.error("[AutoCancellationScheduler] Failed to auto-cancel reservationId={}",
                        reservation.getReservationId(), e);
            }
        });
    }
}


