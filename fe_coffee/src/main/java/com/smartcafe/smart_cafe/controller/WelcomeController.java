package com.smartcafe.smart_cafe.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WelcomeController {
    @GetMapping("/welcome")
    public String first_api() {
        return "Welcome To My first API Project";
    }
}
