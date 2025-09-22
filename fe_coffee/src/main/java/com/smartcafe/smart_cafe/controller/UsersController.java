package com.smartcafe.smart_cafe.controller;

import com.smartcafe.smart_cafe.repository.BookingRepository;
import com.smartcafe.smart_cafe.repository.OrderRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class UsersController {

    private final BookingRepository bookingRepository;
    private final OrderRepository orderRepository;

    public UsersController(BookingRepository bookingRepository, OrderRepository orderRepository) {
        this.bookingRepository = bookingRepository;
        this.orderRepository = orderRepository;
    }

    @GetMapping({ "/users", "/users/", "/users/index" })
    public String usersIndex(HttpSession session) {
        if (session.getAttribute("username") == null) {
            return "redirect:/auth/login";
        }
        return "users/index";
    }

    @GetMapping({ "/users/bookings", "/users/bookings/" })
    public String usersBookings(HttpSession session, Model model) {
        if (session.getAttribute("username") == null) {
            return "redirect:/auth/login";
        }
        Integer userId = (Integer) session.getAttribute("userId");
        model.addAttribute("bookings", bookingRepository.findByUserIdOrderByCreatedAtDesc(userId));
        return "users/bookings";
    }

    @GetMapping({ "/users/orders", "/users/orders/" })
    public String usersOrders(HttpSession session, org.springframework.ui.Model model) {
        if (session.getAttribute("username") == null) {
            return "redirect:/auth/login";
        }
        Integer userId = (Integer) session.getAttribute("userId");
        model.addAttribute("orders", orderRepository.findByUserIdOrderByCreatedAtDesc(userId));
        return "users/orders";
    }
}
