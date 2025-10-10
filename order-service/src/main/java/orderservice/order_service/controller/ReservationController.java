package orderservice.order_service.controller;

import jakarta.validation.Valid;
import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.dto.request.CreateReservationRequest;
import orderservice.order_service.dto.response.ReservationResponse;
import orderservice.order_service.service.ReservationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    private final ReservationService reservationService;

    @Autowired
    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ReservationResponse>> createReservation(
            @Valid @RequestBody CreateReservationRequest request) {
        try {
            // Get JWT token from SecurityContext
            String token = getCurrentToken();

            ReservationResponse reservation = reservationService.createReservation(request, token);
            ApiResponse<ReservationResponse> response = ApiResponse.<ReservationResponse>builder()
                    .code(200)
                    .message("Reservation created successfully")
                    .result(reservation)
                    .build();
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            ApiResponse<ReservationResponse> response = ApiResponse.<ReservationResponse>builder()
                    .code(500)
                    .message("Failed to create reservation: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<ApiResponse<List<ReservationResponse>>> getReservationsByCustomer(
            @PathVariable Integer customerId) {
        try {
            List<ReservationResponse> reservations = reservationService.getReservationsByCustomer(customerId);
            ApiResponse<List<ReservationResponse>> response = ApiResponse.<List<ReservationResponse>>builder()
                    .code(200)
                    .message("Reservations retrieved successfully")
                    .result(reservations)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<List<ReservationResponse>> response = ApiResponse.<List<ReservationResponse>>builder()
                    .code(500)
                    .message("Failed to retrieve reservations: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/branch/{branchId}")
    public ResponseEntity<ApiResponse<List<ReservationResponse>>> getReservationsByBranch(
            @PathVariable Integer branchId) {
        try {
            List<ReservationResponse> reservations = reservationService.getReservationsByBranch(branchId);
            ApiResponse<List<ReservationResponse>> response = ApiResponse.<List<ReservationResponse>>builder()
                    .code(200)
                    .message("Reservations retrieved successfully")
                    .result(reservations)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<List<ReservationResponse>> response = ApiResponse.<List<ReservationResponse>>builder()
                    .code(500)
                    .message("Failed to retrieve reservations: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{reservationId}")
    public ResponseEntity<ApiResponse<ReservationResponse>> getReservationById(@PathVariable Integer reservationId) {
        try {
            Optional<ReservationResponse> reservation = reservationService.getReservationById(reservationId);
            if (reservation.isPresent()) {
                ApiResponse<ReservationResponse> response = ApiResponse.<ReservationResponse>builder()
                        .code(200)
                        .message("Reservation retrieved successfully")
                        .result(reservation.get())
                        .build();
                return ResponseEntity.ok(response);
            } else {
                ApiResponse<ReservationResponse> response = ApiResponse.<ReservationResponse>builder()
                        .code(404)
                        .message("Reservation not found")
                        .result(null)
                        .build();
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            ApiResponse<ReservationResponse> response = ApiResponse.<ReservationResponse>builder()
                    .code(500)
                    .message("Failed to retrieve reservation: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/{reservationId}/status")
    public ResponseEntity<ApiResponse<ReservationResponse>> updateReservationStatus(@PathVariable Integer reservationId,
            @RequestParam String status) {
        try {
            ReservationResponse reservation = reservationService.updateReservationStatus(reservationId, status);
            ApiResponse<ReservationResponse> response = ApiResponse.<ReservationResponse>builder()
                    .code(200)
                    .message("Reservation status updated successfully")
                    .result(reservation)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<ReservationResponse> response = ApiResponse.<ReservationResponse>builder()
                    .code(500)
                    .message("Failed to update reservation status: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/{reservationId}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelReservation(@PathVariable Integer reservationId) {
        try {
            reservationService.cancelReservation(reservationId);
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(200)
                    .message("Reservation cancelled successfully")
                    .result(null)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(500)
                    .message("Failed to cancel reservation: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping("/{reservationId}")
    public ResponseEntity<ApiResponse<Void>> deleteReservation(@PathVariable Integer reservationId) {
        try {
            reservationService.deleteReservation(reservationId);
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(200)
                    .message("Reservation deleted successfully")
                    .result(null)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(500)
                    .message("Failed to delete reservation: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    private String getCurrentToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getCredentials() != null) {
            return authentication.getCredentials().toString();
        }
        return null;
    }
}
