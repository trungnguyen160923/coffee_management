package orderservice.order_service.service;

import orderservice.order_service.dto.request.CreateReservationRequest;
import orderservice.order_service.entity.Reservation;
import orderservice.order_service.repository.ReservationRepository;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class ReservationService {

    private final ReservationRepository reservationRepository;

    public ReservationService(ReservationRepository reservationRepository) {
        this.reservationRepository = reservationRepository;
    }

    public Reservation createReservation(CreateReservationRequest request) {
        if (request.getBranchId() == null || request.getReservedAt() == null || request.getPartySize() == null) {
            throw new IllegalArgumentException("branchId, reservedAt, partySize are required");
        }
        if (!StringUtils.hasText(request.getCustomerName()) || !StringUtils.hasText(request.getPhone())) {
            throw new IllegalArgumentException("customerName and phone are required");
        }
        Reservation reservation = new Reservation();
        reservation.setCustomerName(request.getCustomerName());
        reservation.setPhone(request.getPhone());
        reservation.setBranchId(request.getBranchId());
        reservation.setReservedAt(request.getReservedAt());
        reservation.setPartySize(request.getPartySize());
        reservation.setNotes(request.getNotes());
        reservation.setStatus("PENDING");
        return reservationRepository.save(reservation);
    }
}


