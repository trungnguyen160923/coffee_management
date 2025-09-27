package orderservice.order_service.configuration;

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

@Component
public class CustomJwtDecoder implements JwtDecoder {
    
    @Value("${jwt.signerKey}")
    private String signerKey;
    
    @Override
    public Jwt decode(String token) throws JwtException {
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            
            // Verify signature
            MACVerifier verifier = new MACVerifier(signerKey.getBytes());
            boolean verified = signedJWT.verify(verifier);
            
            if (!verified) {
                throw new JwtException("Invalid token signature");
            }
            
            // Check expiration
            Date now = new Date();
            if (signedJWT.getJWTClaimsSet().getExpirationTime().before(now)) {
                throw new JwtException("Token has expired");
            }
            
            return new Jwt(
                    token,
                    signedJWT.getJWTClaimsSet().getIssueTime().toInstant(),
                    signedJWT.getJWTClaimsSet().getExpirationTime().toInstant(),
                    signedJWT.getHeader().toJSONObject(),
                    signedJWT.getJWTClaimsSet().getClaims());

        } catch (ParseException e) {
            throw new JwtException("Invalid token format");
        } catch (JOSEException e) {
            throw new JwtException("Token verification failed");
        }
    }
}
