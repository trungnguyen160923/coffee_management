package orderservice.order_service.service;

import orderservice.order_service.client.AuthServiceClient;
import orderservice.order_service.dto.request.CreateReservationRequest;
import orderservice.order_service.dto.response.ApiResponse;
import orderservice.order_service.dto.response.ReservationResponse;
import orderservice.order_service.dto.response.TableResponse;
import orderservice.order_service.dto.response.UserResponse;
import orderservice.order_service.entity.Branch;
import orderservice.order_service.entity.CafeTable;
import orderservice.order_service.entity.Reservation;
import orderservice.order_service.entity.ReservationTable;
import orderservice.order_service.events.ReservationCreatedEvent;
import orderservice.order_service.exception.AppException;
import orderservice.order_service.exception.ErrorCode;
import orderservice.order_service.repository.BranchRepository;
import orderservice.order_service.repository.CafeTableRepository;
import orderservice.order_service.repository.ReservationRepository;
import orderservice.order_service.repository.ReservationTableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final BranchRepository branchRepository;
    private final CafeTableRepository cafeTableRepository;
    private final ReservationTableRepository reservationTableRepository;
    private final AuthServiceClient authServiceClient;
    private final EmailService emailService;
    private final OrderEventProducer orderEventProducer;

    @Autowired
    public ReservationService(ReservationRepository reservationRepository,
            BranchRepository branchRepository,
            CafeTableRepository cafeTableRepository,
            ReservationTableRepository reservationTableRepository,
            AuthServiceClient authServiceClient,
            EmailService emailService,
            OrderEventProducer orderEventProducer) {
        this.reservationRepository = reservationRepository;
        this.branchRepository = branchRepository;
        this.cafeTableRepository = cafeTableRepository;
        this.reservationTableRepository = reservationTableRepository;
        this.authServiceClient = authServiceClient;
        this.emailService = emailService;
        this.orderEventProducer = orderEventProducer;
    }

    public ReservationResponse createReservation(CreateReservationRequest request, String token) {
        log.info("Creating reservation: branchId={}, reservedAt={}, customerId={}, partySize={}, token present={}", 
                request.getBranchId(), request.getReservedAt(), request.getCustomerId(), request.getPartySize(), token != null);
        
        try {
            // Validate request
            validateReservationRequest(request);
            log.debug("Request validation passed");
        } catch (AppException e) {
            log.error("Request validation failed: {}", e.getMessage());
            throw e;
        }

        // Check if branch exists
        Branch branch = branchRepository.findById(request.getBranchId())
                .orElseThrow(() -> {
                    log.error("Branch not found: {}", request.getBranchId());
                    return new AppException(ErrorCode.BRANCH_NOT_FOUND);
                });
        log.debug("Branch found: {}", branch.getName());

        // Validate reservation time
        try {
            validateReservationTime(request.getReservedAt());
            log.debug("Reservation time validation passed");
        } catch (AppException e) {
            log.error("Reservation time validation failed: {}", e.getMessage());
            throw e;
        }

        // Enforce branch business hours (local time comparison)
        java.time.LocalTime reservedTime = request.getReservedAt().toLocalTime();
        if (branch.getOpenHours() != null && branch.getEndHours() != null) {
            boolean withinHours;
            if (branch.getEndHours().isAfter(branch.getOpenHours())) {
                // Normal same-day window
                withinHours = !reservedTime.isBefore(branch.getOpenHours())
                        && !reservedTime.isAfter(branch.getEndHours());
            } else {
                // Overnight window (e.g., 20:00 -> 02:00)
                withinHours = !reservedTime.isBefore(branch.getOpenHours())
                        || !reservedTime.isAfter(branch.getEndHours());
            }
            if (!withinHours) {
                throw new AppException(ErrorCode.RESERVATION_OUTSIDE_BUSINESS_HOURS);
            }
        }

        Reservation reservation = new Reservation();

        // Handle customer information
        if (request.getCustomerId() != null) {
            // Authenticated user - get user info from auth service
            log.info("Fetching user info for customerId={}, token present={}", request.getCustomerId(), token != null);
            try {
                ApiResponse<UserResponse> response = authServiceClient.getUserById(request.getCustomerId(), token);
                log.debug("Auth service response: {}", response != null ? "received" : "null");
                if (response != null && response.getResult() != null) {
                    UserResponse userInfo = response.getResult();
                    reservation.setCustomerId(request.getCustomerId());
                    reservation.setCustomerName(userInfo.getFullname());
                    reservation.setPhone(userInfo.getPhoneNumber());
                    reservation.setEmail(userInfo.getEmail());
                    log.info("User info retrieved: name={}, email={}", userInfo.getFullname(), userInfo.getEmail());
                } else {
                    log.error("User not found or invalid response for customerId={}", request.getCustomerId());
                    throw new AppException(ErrorCode.EMAIL_NOT_EXISTED);
                }
            } catch (AppException e) {
                log.error("AppException when fetching user: {}", e.getMessage());
                throw e;
            } catch (Exception e) {
                log.error("Exception when fetching user info for customerId={}: {}", request.getCustomerId(), e.getMessage(), e);
                throw new AppException(ErrorCode.EMAIL_NOT_EXISTED);
            }
        } else {
            // Non-authenticated user - use provided information
            log.info("Guest reservation: name={}, email={}, phone={}", 
                    request.getCustomerName(), request.getEmail(), request.getPhone());
            reservation.setCustomerName(request.getCustomerName());
            reservation.setPhone(request.getPhone());
            reservation.setEmail(request.getEmail());
        }

        // Set reservation details
        reservation.setBranchId(request.getBranchId());
        reservation.setReservedAt(request.getReservedAt());
        reservation.setPartySize(request.getPartySize());
        reservation.setNotes(request.getNotes());
        reservation.setStatus("PENDING");

        Reservation savedReservation = reservationRepository.save(reservation);
        log.info("Reservation saved successfully: reservationId={}", savedReservation.getReservationId());

        // Send confirmation email if we have an email (non-blocking - don't fail reservation if email fails)
        String toEmail = reservation.getEmail();
        if (toEmail != null && !toEmail.trim().isEmpty()) {
            try {
                String customerName = reservation.getCustomerName();
                String branchName = branch.getName();
                emailService.sendReservationConfirmationEmail(
                        toEmail,
                        customerName,
                        branchName,
                        reservation.getReservedAt(),
                        reservation.getPartySize(),
                        reservation.getNotes(),
                        savedReservation.getReservationId());
            } catch (Exception e) {
                log.warn("Failed to send reservation confirmation email, but reservation was created successfully: reservationId={}, error={}", 
                        savedReservation.getReservationId(), e.getMessage());
                // Don't throw - email failure should not prevent reservation creation
            }
        } else {
            log.info("No email provided, skipping email notification for reservationId={}", savedReservation.getReservationId());
        }

        // Publish reservation created event to Kafka for staff + notification service
        try {
            String branchName = branch.getName();
            ReservationCreatedEvent event = ReservationCreatedEvent.builder()
                    .reservationId(savedReservation.getReservationId())
                    .branchId(savedReservation.getBranchId())
                    .branchName(branchName)
                    .customerId(savedReservation.getCustomerId())
                    .customerName(savedReservation.getCustomerName())
                    .phone(savedReservation.getPhone())
                    .email(savedReservation.getEmail())
                    .reservedAt(savedReservation.getReservedAt())
                    .partySize(savedReservation.getPartySize())
                    .notes(savedReservation.getNotes())
                    .createdAt(java.time.Instant.now())
                    .build();
            orderEventProducer.publishReservationCreated(event);
            log.info("[ReservationService] ✅ Successfully triggered event publishing for reservationId: {}", 
                    savedReservation.getReservationId());
        } catch (Exception e) {
            log.error("[ReservationService] ❌ Failed to publish reservation created event for reservationId: {}", 
                    savedReservation.getReservationId(), e);
            // Don't fail reservation creation if event publishing fails
        }

        return convertToResponse(savedReservation, branch);
    }

    public List<ReservationResponse> getReservationsByCustomer(Integer customerId) {
        List<Reservation> reservations = reservationRepository.findByCustomerIdOrderByReservedAtDesc(customerId);
        return reservations.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public List<ReservationResponse> getReservationsByBranch(Integer branchId) {
        List<Reservation> reservations = reservationRepository.findByBranchIdOrderByReservedAtDesc(branchId);
        return reservations.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public Optional<ReservationResponse> getReservationById(Integer reservationId) {
        return reservationRepository.findById(reservationId)
                .map(this::convertToResponse);
    }

    public ReservationResponse updateReservationStatus(Integer reservationId, String status) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new AppException(ErrorCode.RESERVATION_NOT_FOUND));

        reservation.setStatus(status);
        Reservation updatedReservation = reservationRepository.save(reservation);

        // Publish event when reservation is confirmed or cancelled
        if (("CONFIRMED".equals(status) || "confirmed".equalsIgnoreCase(status)) && updatedReservation.getCustomerId() != null) {
            try {
                Branch branch = branchRepository.findById(updatedReservation.getBranchId()).orElse(null);
                String branchName = branch != null ? branch.getName() : null;
                ReservationCreatedEvent event = ReservationCreatedEvent.builder()
                        .reservationId(updatedReservation.getReservationId())
                        .branchId(updatedReservation.getBranchId())
                        .branchName(branchName)
                        .customerId(updatedReservation.getCustomerId())
                        .customerName(updatedReservation.getCustomerName())
                        .phone(updatedReservation.getPhone())
                        .email(updatedReservation.getEmail())
                        .reservedAt(updatedReservation.getReservedAt())
                        .partySize(updatedReservation.getPartySize())
                        .notes(updatedReservation.getNotes())
                        .createdAt(java.time.Instant.now())
                        .build();
                orderEventProducer.publishReservationConfirmed(event);
                log.info("[ReservationService] ✅ Successfully triggered event publishing for confirmed reservationId: {}", 
                        updatedReservation.getReservationId());
            } catch (Exception e) {
                log.error("[ReservationService] ❌ Failed to publish reservation confirmed event for reservationId: {}", 
                        updatedReservation.getReservationId(), e);
                // Don't fail status update if event publishing fails
            }
        }

        if (("CANCELLED".equals(status) || "cancelled".equalsIgnoreCase(status)) && updatedReservation.getCustomerId() != null) {
            try {
                Branch branch = branchRepository.findById(updatedReservation.getBranchId()).orElse(null);
                String branchName = branch != null ? branch.getName() : null;
                ReservationCreatedEvent event = ReservationCreatedEvent.builder()
                        .reservationId(updatedReservation.getReservationId())
                        .branchId(updatedReservation.getBranchId())
                        .branchName(branchName)
                        .customerId(updatedReservation.getCustomerId())
                        .customerName(updatedReservation.getCustomerName())
                        .phone(updatedReservation.getPhone())
                        .email(updatedReservation.getEmail())
                        .reservedAt(updatedReservation.getReservedAt())
                        .partySize(updatedReservation.getPartySize())
                        .notes(updatedReservation.getNotes())
                        .createdAt(java.time.Instant.now())
                        .build();
                orderEventProducer.publishReservationCancelled(event);
                log.info("[ReservationService] ✅ Successfully triggered event publishing for cancelled reservationId: {}", 
                        updatedReservation.getReservationId());
            } catch (Exception e) {
                log.error("[ReservationService] ❌ Failed to publish reservation cancelled event for reservationId: {}", 
                        updatedReservation.getReservationId(), e);
                // Don't fail status update if event publishing fails
            }
        }

        return convertToResponse(updatedReservation);
    }

    public void cancelReservation(Integer reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new AppException(ErrorCode.RESERVATION_NOT_FOUND));

        if ("CONFIRMED".equals(reservation.getStatus()) || "PENDING".equals(reservation.getStatus())) {
            reservation.setStatus("CANCELLED");
            Reservation updatedReservation = reservationRepository.save(reservation);

            // Publish event when reservation is cancelled
            if (updatedReservation.getCustomerId() != null) {
                try {
                    Branch branch = branchRepository.findById(updatedReservation.getBranchId()).orElse(null);
                    String branchName = branch != null ? branch.getName() : null;
                    ReservationCreatedEvent event = ReservationCreatedEvent.builder()
                            .reservationId(updatedReservation.getReservationId())
                            .branchId(updatedReservation.getBranchId())
                            .branchName(branchName)
                            .customerId(updatedReservation.getCustomerId())
                            .customerName(updatedReservation.getCustomerName())
                            .phone(updatedReservation.getPhone())
                            .email(updatedReservation.getEmail())
                            .reservedAt(updatedReservation.getReservedAt())
                            .partySize(updatedReservation.getPartySize())
                            .notes(updatedReservation.getNotes())
                            .createdAt(java.time.Instant.now())
                            .build();
                    orderEventProducer.publishReservationCancelled(event);
                    log.info("[ReservationService] ✅ Successfully triggered event publishing for cancelled reservationId: {}", 
                            updatedReservation.getReservationId());
                } catch (Exception e) {
                    log.error("[ReservationService] ❌ Failed to publish reservation cancelled event for reservationId: {}", 
                            updatedReservation.getReservationId(), e);
                    // Don't fail cancellation if event publishing fails
                }
            }
        } else {
            throw new AppException(ErrorCode.RESERVATION_CANNOT_BE_CANCELLED);
        }
    }

    public void deleteReservation(Integer reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new AppException(ErrorCode.RESERVATION_NOT_FOUND));
        reservationRepository.delete(reservation);
    }

    private void validateReservationRequest(CreateReservationRequest request) {
        if (request.getBranchId() == null) {
            throw new AppException(ErrorCode.EMPTY_BRANCH_ID);
        }
        if (request.getReservedAt() == null) {
            throw new AppException(ErrorCode.EMPTY_RESERVATION_TIME);
        }
        if (request.getPartySize() == null || request.getPartySize() < 1) {
            throw new AppException(ErrorCode.INVALID_PARTY_SIZE);
        }
        if (!request.isValidCustomerInfo()) {
            throw new AppException(ErrorCode.INVALID_CUSTOMER_INFO);
        }
    }

    private void validateReservationTime(LocalDateTime reservedAt) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime minReservationTime = now.plusHours(1); // Minimum 1 hour advance booking
        LocalDateTime maxReservationTime = now.plusDays(30); // Maximum 30 days advance booking

        if (reservedAt.isBefore(minReservationTime)) {
            throw new AppException(ErrorCode.RESERVATION_TIME_TOO_EARLY);
        }
        if (reservedAt.isAfter(maxReservationTime)) {
            throw new AppException(ErrorCode.RESERVATION_TIME_TOO_LATE);
        }
    }

    private ReservationResponse convertToResponse(Reservation reservation) {
        Branch branch = branchRepository.findById(reservation.getBranchId()).orElse(null);
        return convertToResponse(reservation, branch);
    }

    private ReservationResponse convertToResponse(Reservation reservation, Branch branch) {
        // Get assigned tables for this reservation
        List<ReservationTable> reservationTables = reservationTableRepository
                .findByReservationId(reservation.getReservationId());
        List<TableResponse> assignedTables = reservationTables.stream()
                .map(rt -> {
                    CafeTable table = cafeTableRepository.findById(rt.getTableId()).orElse(null);
                    if (table != null) {
                        TableResponse tableResponse = new TableResponse();
                        tableResponse.setTableId(table.getTableId());
                        tableResponse.setBranchId(table.getBranchId());
                        tableResponse.setLabel(table.getLabel());
                        tableResponse.setCapacity(table.getCapacity());
                        tableResponse.setStatus(table.getStatus());
                        tableResponse.setCreateAt(table.getCreateAt());
                        tableResponse.setUpdateAt(table.getUpdateAt());
                        return tableResponse;
                    }
                    return null;
                })
                .filter(table -> table != null)
                .collect(Collectors.toList());

        ReservationResponse response = new ReservationResponse();
        response.setReservationId(reservation.getReservationId());
        response.setCustomerId(reservation.getCustomerId());
        response.setCustomerName(reservation.getCustomerName());
        response.setPhone(reservation.getPhone());
        response.setEmail(reservation.getEmail());
        response.setBranchId(reservation.getBranchId());
        response.setBranchName(branch != null ? branch.getName() : null);
        response.setReservedAt(reservation.getReservedAt());
        response.setStatus(reservation.getStatus());
        response.setPartySize(reservation.getPartySize());
        response.setNotes(reservation.getNotes());
        response.setCreateAt(reservation.getCreateAt());
        response.setUpdateAt(reservation.getUpdateAt());
        response.setAssignedTables(assignedTables);
        return response;
    }

    public long getReservationCount() {
        return reservationRepository.count();
    }
}
