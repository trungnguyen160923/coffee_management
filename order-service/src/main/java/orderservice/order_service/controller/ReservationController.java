package orderservice.order_service.controller;

import orderservice.order_service.dto.request.CreateReservationRequest;
import orderservice.order_service.entity.Reservation;
import orderservice.order_service.service.ReservationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/order/reservations")
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:3001", "http://localhost:8080" })
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @PostMapping
    public ResponseEntity<Reservation> create(@RequestBody CreateReservationRequest request) {
        System.out.println("Received reservation request: " + request);
        Reservation saved = reservationService.createReservation(request);
        System.out.println("Created reservation: " + saved);
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<String> test() {
        return ResponseEntity.ok("Order Service is running!");
    }

    @GetMapping("test")
    public void TestAPIADMIN(){
        reservationService.testAPIADMIN();
    }
}
