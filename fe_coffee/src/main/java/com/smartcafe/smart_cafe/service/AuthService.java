package com.smartcafe.smart_cafe.service;

import com.smartcafe.smart_cafe.model.User;
import com.smartcafe.smart_cafe.repository.UserRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Optional<User> authenticateByEmailAndPassword(String email, String passwordPlaintext) {
        return userRepository.findByEmail(email)
                .filter(u -> u.getPassword() != null && u.getPassword().equals(passwordPlaintext));
    }
}
