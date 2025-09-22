package com.smartcafe.smart_cafe.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class CoffeeController {

    @GetMapping({ "/coffee", "/coffee/", "/coffee/index" })
    public String coffeeIndex() {
        return "coffee/index";
    }

    @GetMapping("/coffee/menu")
    public String coffeeMenu() {
        return "coffee/menu";
    }

    @GetMapping("/coffee/about")
    public String coffeeAbout() {
        return "coffee/about";
    }

    @GetMapping("/coffee/services")
    public String coffeeServices() {
        return "coffee/services";
    }

    @GetMapping("/coffee/contact")
    public String coffeeContact() {
        return "coffee/contact";
    }
}
