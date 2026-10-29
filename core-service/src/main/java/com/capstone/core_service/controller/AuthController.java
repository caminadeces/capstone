package com.capstone.core_service.controller;

import com.capstone.core_service.model.AppUser;
import com.capstone.core_service.repository.UserRepository;
import com.capstone.core_service.service.TokenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public endpoints for account registration and login. */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Register and authenticate users")
public class AuthController {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final TokenService tokens;

    /** Creates the controller with user persistence, password hashing, and token issuance dependencies. */
    public AuthController(UserRepository users, PasswordEncoder passwords, TokenService tokens) {
        this.users = users;
        this.passwords = passwords;
        this.tokens = tokens;
    }

    /** Validated email and password submitted for registration or login. */
    @Schema(description = "Email address and password credentials")
    public record Credentials(
            @Schema(description = "User email address", example = "user@example.com")
                    @Email @NotBlank String email,
            @Schema(
                            description = "Password (8 to 72 characters)",
                            minLength = 8,
                            maxLength = 72,
                            accessMode = Schema.AccessMode.WRITE_ONLY)
                    @NotBlank @Size(min = 8, max = 72) String password) {}

    /** Public user details returned by authentication endpoints. */
    public record UserView(
            @Schema(description = "Persisted user identifier", example = "42") Long id,
            @Schema(description = "Registered email address", example = "user@example.com")
                    String email) {}

    /** Bearer token and public user details returned after successful authentication. */
    public record AuthResponse(
            @Schema(description = "Signed access token") String token,
            @Schema(description = "Authorization scheme", example = "Bearer") String tokenType,
            @Schema(description = "Authenticated user profile") UserView user) {}

    /** Registers a unique email and returns a bearer token, or 409 when the email is already taken. */
    @PostMapping("/register")
    @Operation(summary = "Register a user and return an access token")
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "201", description = "Account created"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "409", description = "Email is already registered"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400", description = "Invalid credentials")})
    public ResponseEntity<?> register(@Valid @RequestBody Credentials input) {
        String email = input.email().trim().toLowerCase(Locale.ROOT);
        if (users.findByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(java.util.Map.of("error", "Email is already registered"));
        }
        AppUser user = users.save(new AppUser(email, passwords.encode(input.password())));
        return ResponseEntity.status(HttpStatus.CREATED).body(response(user));
    }
    /** Validates credentials and returns a bearer token, or 401 when they do not match. */
    @PostMapping("/login")
    @Operation(summary = "Log in and return an access token")
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Authentication succeeded"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401", description = "Email or password is invalid"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400", description = "Invalid credentials")})
    public ResponseEntity<?> login(@Valid @RequestBody Credentials input) {
        AppUser user = users.findByEmail(input.email().trim().toLowerCase(Locale.ROOT)).orElse(null);
        if (user == null || !passwords.matches(input.password(), user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(java.util.Map.of("error", "Invalid email or password"));
        }
        return ResponseEntity.ok(response(user));
    }

    /** Builds the public authentication response and issues a bearer token. */
    private AuthResponse response(AppUser user) {
        return new AuthResponse(
                tokens.issue(user), "Bearer", new UserView(user.getId(), user.getEmail()));
    }
}
