package com.service.auth.controller;

import com.nimbusds.jose.JOSEException;
import com.service.auth.dto.request.AuthenticationRequest;
import com.service.auth.dto.request.IntrospectRequest;
import com.service.auth.dto.request.LogoutRequest;
import com.service.auth.dto.request.RefreshRequest;
import com.service.auth.dto.response.ApiResponse;
import com.service.auth.dto.response.AuthenticationResponse;
import com.service.auth.dto.response.IntrospectResponse;
import com.service.auth.service.AuthenticationService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import jakarta.validation.Valid;

import java.text.ParseException;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationController {
    AuthenticationService authenticationService;

    @PostMapping("/token")
    ApiResponse<AuthenticationResponse> authenticate(@Valid @RequestBody AuthenticationRequest request) {
        var result = authenticationService.authenticate(request);
        return ApiResponse.<AuthenticationResponse>builder().result(result).build();
    }

   @PostMapping("/introspect")
   ApiResponse<IntrospectResponse> authenticate(@Valid @RequestBody IntrospectRequest request) {
       var result = authenticationService.introspect(request);
       return ApiResponse.<IntrospectResponse>builder().result(result).build();
   }

    @PostMapping("/refresh")
    ApiResponse<AuthenticationResponse> authenticate(@Valid @RequestBody RefreshRequest request)
            throws ParseException, JOSEException {
        var result = authenticationService.refreshToken(request);
        return ApiResponse.<AuthenticationResponse>builder().result(result).build();
    }

    @PostMapping("/logout")
    ApiResponse<Void> logout(@Valid @RequestBody LogoutRequest request) throws ParseException, JOSEException {
        authenticationService.logout(request);
        return ApiResponse.<Void>builder().build();
    }
}
