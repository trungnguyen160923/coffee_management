package com.service.auth.service;

import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.StringJoiner;
import java.util.UUID;

import com.service.auth.dto.request.AuthenticationRequest;
import com.service.auth.dto.request.ChangePasswordRequest;
import com.service.auth.dto.request.IntrospectRequest;
import com.service.auth.dto.request.RefreshRequest;
import com.service.auth.dto.response.AuthenticationResponse;
import com.service.auth.dto.response.IntrospectResponse;
import com.service.auth.entity.InvalidatedToken;
import com.service.auth.entity.User;
import com.service.auth.exception.AppException;
import com.service.auth.exception.ErrorCode;
import com.service.auth.repository.InvalidatedTokenRepository;
import com.service.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationService {
    UserRepository userRepository;
    InvalidatedTokenRepository invalidatedTokenRepository;

    @NonFinal
    @Value("${jwt.signerKey}")
    protected String SIGNER_KEY;

    @NonFinal
    @Value("${jwt.valid-duration}")
    protected long VALID_DURATION;

    @NonFinal
    @Value("${jwt.refreshable-duration}")
    protected long REFRESHABLE_DURATION;

    public IntrospectResponse introspect(IntrospectRequest request) {
        var token = request.getToken();
        boolean isValid = true;

        try {
            verifyToken(token, false);
        } catch (AppException | JOSEException | ParseException e) {
            isValid = false;
        }

        return IntrospectResponse.builder().valid(isValid).build();
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);
        var user = userRepository
                .findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.EMAIL_NOT_EXISTED));

        boolean authenticated = passwordEncoder.matches(request.getPassword(), user.getPassword());

        if (!authenticated)
            throw new AppException(ErrorCode.INCORRECT_PASSWORD);

        var tokenInfo = generateToken(user);

        return AuthenticationResponse.builder()
                .token(tokenInfo.token())
                .expiryTime(tokenInfo.expiryDate())
                .build();
    }

    public void logout(String token) throws ParseException, JOSEException {
        try {
            var signToken = verifyToken(token, true);

            String jit = signToken.getJWTClaimsSet().getJWTID();
            Date expiryTime = signToken.getJWTClaimsSet().getExpirationTime();

            InvalidatedToken invalidatedToken = InvalidatedToken.builder().id(jit).expiryTime(expiryTime).build();

            invalidatedTokenRepository.save(invalidatedToken);
        } catch (AppException exception) {
            log.info("Token already expired");
        }
    }

    public AuthenticationResponse refreshToken(RefreshRequest request) throws ParseException, JOSEException {
        var signedJWT = verifyToken(request.getToken(), true);

        var jit = signedJWT.getJWTClaimsSet().getJWTID();
        // Invalidate until refresh window end: issueTime + REFRESHABLE_DURATION
        var refreshWindowEnd = Date.from(
                signedJWT.getJWTClaimsSet().getIssueTime().toInstant().plus(REFRESHABLE_DURATION, ChronoUnit.SECONDS));

        InvalidatedToken invalidatedToken = InvalidatedToken.builder().id(jit).expiryTime(refreshWindowEnd).build();

        invalidatedTokenRepository.save(invalidatedToken);

        var email = signedJWT.getJWTClaimsSet().getSubject();

        var user = userRepository.findByEmail(email).orElseThrow(() -> new AppException(ErrorCode.UNAUTHENTICATED));

        var token = generateToken(user);

        return AuthenticationResponse.builder()
                .token(token.token())
                .expiryTime(token.expiryDate())
                .build();
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        // Get current user from SecurityContext
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || auth.getPrincipal() == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        // Extract userId from JWT token claims
        Integer userId;
        if (auth.getPrincipal() instanceof Jwt jwt) {
            // Get user_id from JWT claims (it's stored as Long, convert to Integer)
            Long userIdLong = jwt.getClaim("user_id");

            if (userIdLong != null) {
                userId = userIdLong.intValue();
            } else {
                throw new AppException(ErrorCode.UNAUTHENTICATED);
            }
        } else {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        // Get user from database
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Verify old password
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);
        boolean isOldPasswordCorrect = passwordEncoder.matches(request.getOldPassword(), user.getPassword());

        if (!isOldPasswordCorrect) {
            throw new AppException(ErrorCode.INCORRECT_PASSWORD);
        }

        // Check if new password is different from old password
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.INVALID_PASSWORD, "New password must be different from old password");
        }

        // Encode and update password
        String encodedNewPassword = passwordEncoder.encode(request.getNewPassword());
        user.setPassword(encodedNewPassword);
        userRepository.save(user);

        log.info("Password changed successfully for user: {}", user.getEmail());
    }

    private TokenInfo generateToken(User user) {
        JWSHeader header = new JWSHeader(JWSAlgorithm.HS512);

        Date expiresAt = new Date(
                Instant.now().plus(VALID_DURATION, ChronoUnit.SECONDS).toEpochMilli());

        JWTClaimsSet jwtClaimsSet = new JWTClaimsSet.Builder()
                .subject(user.getEmail())
                .issuer("caffe-manager.com")
                .issueTime(new Date())
                .expirationTime(expiresAt)
                .jwtID(UUID.randomUUID().toString())
                .claim("scope", buildScope(user))
                // Thêm role để các service downstream (profile-service) đọc trực tiếp
                .claim("role", user.getRole() != null ? user.getRole().getName() : null)
                .claim("user_id", user.getUserId())
                .build();

        Payload payload = new Payload(jwtClaimsSet.toJSONObject());

        JWSObject jwsObject = new JWSObject(header, payload);

        try {
            // Sử dụng UTF-8 encoding để đảm bảo nhất quán giữa dev và prod
            jwsObject.sign(new MACSigner(SIGNER_KEY.getBytes(StandardCharsets.UTF_8)));
            return new TokenInfo(jwsObject.serialize(), expiresAt);
        } catch (JOSEException e) {
            log.error("Cannot create token", e);
            throw new RuntimeException(e);
        }
    }

    private SignedJWT verifyToken(String token, boolean isRefresh) throws JOSEException, ParseException {
        // Sử dụng UTF-8 encoding để đảm bảo nhất quán giữa dev và prod
        JWSVerifier verifier = new MACVerifier(SIGNER_KEY.getBytes(StandardCharsets.UTF_8));

        SignedJWT signedJWT = SignedJWT.parse(token);

        Date expiryTime = (isRefresh)
                ? new Date(signedJWT
                        .getJWTClaimsSet()
                        .getIssueTime()
                        .toInstant()
                        .plus(REFRESHABLE_DURATION, ChronoUnit.SECONDS)
                        .toEpochMilli())
                : signedJWT.getJWTClaimsSet().getExpirationTime();

        var verified = signedJWT.verify(verifier);

        if (!(verified && expiryTime.after(new Date())))
            throw new AppException(ErrorCode.UNAUTHENTICATED);

        if (invalidatedTokenRepository.existsById(signedJWT.getJWTClaimsSet().getJWTID()))
            throw new AppException(ErrorCode.UNAUTHENTICATED);

        return signedJWT;
    }

    private String buildScope(User user) {
        StringJoiner stringJoiner = new StringJoiner(" ");

        if (user.getRole() != null)
            stringJoiner.add("ROLE_" + user.getRole().getName());
        return stringJoiner.toString();
    }

    private record TokenInfo(String token, Date expiryDate) {
    }
}
