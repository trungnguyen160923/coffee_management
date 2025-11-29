package com.service.auth.configuration;

import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.util.Date;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.SignedJWT;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class CustomJwtDecoder implements JwtDecoder {
    
    @Value("${jwt.signerKey}")
    private String signerKey;
    
    @Override
    public Jwt decode(String token) throws JwtException {
        log.info("[CustomJwtDecoder] Step 1: Starting token decode - tokenLength={}, hasSignerKey={}, signerKeyLength={}", 
            token != null ? token.length() : 0,
            signerKey != null && !signerKey.isEmpty(),
            signerKey != null ? signerKey.length() : 0);
        
        try {
            log.info("[CustomJwtDecoder] Step 2: Parsing token...");
            SignedJWT signedJWT = SignedJWT.parse(token);
            log.info("[CustomJwtDecoder] Step 3: Token parsed successfully - subject={}, userId={}, scope={}, exp={}, iat={}", 
                signedJWT.getJWTClaimsSet().getSubject(),
                signedJWT.getJWTClaimsSet().getClaim("user_id"),
                signedJWT.getJWTClaimsSet().getClaim("scope"),
                signedJWT.getJWTClaimsSet().getExpirationTime(),
                signedJWT.getJWTClaimsSet().getIssueTime());
            
            // Verify signature với signerKey - sử dụng UTF-8 encoding để đảm bảo nhất quán
            log.info("[CustomJwtDecoder] Step 4: Creating verifier with signerKey...");
            MACVerifier verifier = new MACVerifier(signerKey.getBytes(StandardCharsets.UTF_8));
            log.info("[CustomJwtDecoder] Step 5: Verifying token signature...");
            boolean verified = signedJWT.verify(verifier);
            log.info("[CustomJwtDecoder] Step 6: Signature verification result - verified={}", verified);
            
            if (!verified) {
                log.warn("[CustomJwtDecoder] Token signature verification failed");
                throw new JwtException("Invalid token signature");
            }
            
            // Kiểm tra expiration time
            Date expirationTime = signedJWT.getJWTClaimsSet().getExpirationTime();
            Date now = new Date();
            boolean isExpired = expirationTime != null && expirationTime.before(now);
            log.info("[CustomJwtDecoder] Step 7: Checking expiration - expirationTime={}, now={}, isExpired={}", 
                expirationTime, now, isExpired);
            
            if (isExpired) {
                log.warn("[CustomJwtDecoder] Token has expired");
                throw new JwtException("Token has expired");
            }
            
            log.info("[CustomJwtDecoder] Step 8: Token decoded successfully, creating Jwt object");
            Jwt jwt = new Jwt(
                    token,
                    signedJWT.getJWTClaimsSet().getIssueTime().toInstant(),
                    signedJWT.getJWTClaimsSet().getExpirationTime().toInstant(),
                    signedJWT.getHeader().toJSONObject(),
                    signedJWT.getJWTClaimsSet().getClaims());
            log.info("[CustomJwtDecoder] Step 9: Jwt object created successfully");
            return jwt;

        } catch (ParseException e) {
            log.error("[CustomJwtDecoder] Failed to parse token", e);
            throw new JwtException("Invalid token format: " + e.getMessage());
        } catch (JOSEException e) {
            log.error("[CustomJwtDecoder] JOSE exception while verifying token", e);
            throw new JwtException("Token verification failed: " + e.getMessage());
        } catch (Exception e) {
            log.error("[CustomJwtDecoder] Unexpected error while decoding token", e);
            throw new JwtException("Token decoding failed: " + e.getMessage());
        }
    }
}
