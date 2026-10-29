package com.capstone.core_service.service;

import com.capstone.core_service.model.AppUser;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
/** Creates and validates signed tokens used for API bearer authentication. */
public class TokenService {
    private final byte[] secret;

    /** Creates the service using the configured signing secret. */
    public TokenService(@Value("${app.jwt.secret}") String secret) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    /** Issues a signed token containing the user's ID and a 24-hour expiry. */
    public String issue(AppUser user) {
        long expiry = Instant.now().plusSeconds(86400).getEpochSecond();
        String body = user.getId() + "." + expiry;
        String encodedBody =
                Base64.getUrlEncoder()
                        .withoutPadding()
                        .encodeToString(body.getBytes(StandardCharsets.UTF_8));
        return encodedBody + "." + sign(body);
    }

    /** Returns the user ID from a valid, unexpired token, or {@code null} when validation fails. */
    public Long verify(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 2) {
                return null;
            }
            String body = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            if (!MessageDigest.isEqual(
                    sign(body).getBytes(StandardCharsets.UTF_8),
                    parts[1].getBytes(StandardCharsets.UTF_8))) {
                return null;
            }
            String[] claims = body.split("\\.");
            long id = Long.parseLong(claims[0]);
            long expiry = Long.parseLong(claims[1]);
            return Instant.now().getEpochSecond() < expiry ? id : null;
        } catch (RuntimeException exception) {
            return null;
        }
    }

    /** Computes a URL-safe HMAC-SHA256 signature for the token payload. */
    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            byte[] signature = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(signature);
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
