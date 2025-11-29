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
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            
            // Verify signature với signerKey - sử dụng UTF-8 encoding để đảm bảo nhất quán
            MACVerifier verifier = new MACVerifier(signerKey.getBytes(StandardCharsets.UTF_8));
            boolean verified = signedJWT.verify(verifier);
            
            if (!verified) {
                log.warn("[CustomJwtDecoder] Token signature verification failed");
                throw new JwtException("Invalid token signature");
            }
            
            // Kiểm tra expiration time
            Date expirationTime = signedJWT.getJWTClaimsSet().getExpirationTime();
            Date now = new Date();
            boolean isExpired = expirationTime != null && expirationTime.before(now);
            
            if (isExpired) {
                log.warn("[CustomJwtDecoder] Token has expired");
                throw new JwtException("Token has expired");
            }
            
            Jwt jwt = new Jwt(
                    token,
                    signedJWT.getJWTClaimsSet().getIssueTime().toInstant(),
                    signedJWT.getJWTClaimsSet().getExpirationTime().toInstant(),
                    signedJWT.getHeader().toJSONObject(),
                    signedJWT.getJWTClaimsSet().getClaims());
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
