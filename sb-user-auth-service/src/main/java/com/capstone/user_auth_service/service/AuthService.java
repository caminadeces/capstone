package com.capstone.user_auth_service.service;

import com.capstone.user_auth_service.dto.AuthResponse;
import com.capstone.user_auth_service.dto.LoginRequest;
import com.capstone.user_auth_service.dto.RegisterRequest;
import com.capstone.user_auth_service.model.User;
import com.capstone.user_auth_service.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
/** Implements registration and credential verification for user accounts. */
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    /** Creates a user account after normalizing its email and hashing its password.
     * @param users repository used to check and persist accounts
     * @param passwordEncoder encoder used to hash passwords
     */
    public AuthService(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    /** Registers a user and returns their public account details.
     * @param request validated registration details
     * @return public account details for the new user
     * @throws ResponseStatusException with HTTP 409 if the email is already registered
     */
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (users.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        User user = users.save(new User(email, request.name().trim(), passwordEncoder.encode(request.password())));
        return response(user, "Registration successful");
    }

    /** Verifies a user's credentials and returns their public account details.
     * @param request validated login credentials
     * @return public account details for the authenticated user
     * @throws ResponseStatusException with HTTP 401 when the email or password is invalid
     */
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        User user = users.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return response(user, "Login successful");
    }

    public AuthResponse getUser(Long id) {
        User user = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        return response(user, "Session active");
    }

    /** Verifies the current password and stores the encoded replacement. */
    public void changePassword(Long id, String currentPassword, String newPassword) {
        User user = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        user.changePasswordHash(passwordEncoder.encode(newPassword));
        users.save(user);
    }

    /** Trims and lowercases an email for consistent account lookup.
     * @param email email address to normalize
     * @return normalized email address
     */
    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    /** Builds an API response without exposing the stored password hash.
     * @param user account to represent
     * @param message result message
     * @return public authentication response
     */
    private AuthResponse response(User user, String message) {
        return new AuthResponse(user.getId(), user.getEmail(), user.getName(), message);
    }
}
