package com.smartcafe.smart_cafe.controller;

import com.smartcafe.smart_cafe.model.User;
import com.smartcafe.smart_cafe.service.AuthService;
import java.util.Optional;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping({ "/auth/login", "/auth/login/" })
    public String login(Model model) {
        return "auth/login";
    }

    @PostMapping({ "/auth/login", "/auth/login/" })
    public String doLogin(@RequestParam("email") String email,
            @RequestParam("password") String password,
            RedirectAttributes redirectAttributes,
            Model model,
            HttpSession session) {
        Optional<User> user = authService.authenticateByEmailAndPassword(email, password);
        if (user.isPresent()) {
            session.setAttribute("username", user.get().getUsername());
            session.setAttribute("userId", user.get().getId());
            return "redirect:/coffee";
        }
        model.addAttribute("error", "Email hoặc mật khẩu không đúng");
        return "auth/login";
    }

    @GetMapping({ "/auth/register", "/auth/register/" })
    public String register() {
        return "auth/register";
    }

    @GetMapping({ "/auth/forgot-password", "/auth/forgot-password/" })
    public String forgotPassword() {
        return "auth/forgot-password";
    }

    @GetMapping({ "/auth/logout", "/auth/logout/" })
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/coffee";
    }
}
