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
import orderservice.order_service.exception.AppException;
import orderservice.order_service.exception.ErrorCode;
import orderservice.order_service.repository.BranchRepository;
import orderservice.order_service.repository.CafeTableRepository;
import orderservice.order_service.repository.ReservationRepository;
import orderservice.order_service.repository.ReservationTableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final BranchRepository branchRepository;
    private final CafeTableRepository cafeTableRepository;
    private final ReservationTableRepository reservationTableRepository;
    private final AuthServiceClient authServiceClient;
    private final EmailService emailService;

    @Autowired
    public ReservationService(ReservationRepository reservationRepository,
            BranchRepository branchRepository,
            CafeTableRepository cafeTableRepository,
            ReservationTableRepository reservationTableRepository,
            AuthServiceClient authServiceClient,
            EmailService emailService) {
        this.reservationRepository = reservationRepository;
        this.branchRepository = branchRepository;
        this.cafeTableRepository = cafeTableRepository;
        this.reservationTableRepository = reservationTableRepository;
        this.authServiceClient = authServiceClient;
        this.emailService = emailService;
    }

    public ReservationResponse createReservation(CreateReservationRequest request, String token) {
        // Validate request
        validateReservationRequest(request);

        // Check if branch exists
        Branch branch = branchRepository.findById(request.getBranchId())
                .orElseThrow(() -> new AppException(ErrorCode.BRANCH_NOT_FOUND));

        // Validate reservation time
        validateReservationTime(request.getReservedAt());

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
            try {
                ApiResponse<UserResponse> response = authServiceClient.getUserById(request.getCustomerId(), token);
                if (response != null && response.getResult() != null) {
                    UserResponse userInfo = response.getResult();
                    reservation.setCustomerId(request.getCustomerId());
                    reservation.setCustomerName(userInfo.getFullname());
                    reservation.setPhone(userInfo.getPhoneNumber());
                    reservation.setEmail(userInfo.getEmail());
                } else {
                    throw new AppException(ErrorCode.EMAIL_NOT_EXISTED);
                }
            } catch (Exception e) {
                throw new AppException(ErrorCode.EMAIL_NOT_EXISTED);
            }
        } else {
            // Non-authenticated user - use provided information
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

        // Send confirmation email if we have an email
        String toEmail = reservation.getEmail();
        if (toEmail != null && !toEmail.trim().isEmpty()) {
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
        return convertToResponse(updatedReservation);
    }

    public void cancelReservation(Integer reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new AppException(ErrorCode.RESERVATION_NOT_FOUND));

        if ("CONFIRMED".equals(reservation.getStatus()) || "PENDING".equals(reservation.getStatus())) {
            reservation.setStatus("CANCELLED");
            reservationRepository.save(reservation);
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
