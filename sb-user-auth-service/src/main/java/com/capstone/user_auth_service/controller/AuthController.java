package com.capstone.user_auth_service.controller;

import com.capstone.user_auth_service.dto.AuthResponse;
import com.capstone.user_auth_service.dto.LoginRequest;
import com.capstone.user_auth_service.dto.RegisterRequest;
import com.capstone.user_auth_service.service.AuthService;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "User registration and login")
/** HTTP endpoints for registering accounts and checking login credentials. */
public class AuthController {
    private final AuthService authService;

    /** Creates the controller with its authentication service.
     * @param authService service that performs authentication operations
     */
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /** Registers a new account.
     * @param request validated account details
     * @return public details for the created account
     */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a user", description = "Creates an account and stores the password as a BCrypt hash.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Account created"),
            @ApiResponse(responseCode = "400", description = "Invalid request"),
            @ApiResponse(responseCode = "409", description = "Email is already registered")
    })
    public AuthResponse register(@Valid @RequestBody RegisterRequest request, HttpServletRequest servletRequest) {
        AuthResponse response = authService.register(request);
        HttpSession existingSession = servletRequest.getSession(false);
        if (existingSession != null) existingSession.invalidate();
        return response;
    }

    /** Checks an account's login credentials.
     * @param request validated login credentials
     * @return public account details when the credentials are valid
     */
    @PostMapping("/login")
    @Operation(summary = "Log in", description = "Checks the supplied email and password.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Credentials accepted"),
            @ApiResponse(responseCode = "400", description = "Invalid request"),
            @ApiResponse(responseCode = "401", description = "Invalid email or password")
    })
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpSession session) {
        AuthResponse response = authService.login(request);
        session.setAttribute("userId", response.id());
        return response;
    }

    @GetMapping("/session")
    public AuthResponse session(HttpSession session) {
        Object userId = session.getAttribute("userId");
        if (!(userId instanceof Long id)) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return authService.getUser(id);
    }

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8, max = 72) String newPassword) {}

    @PutMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Change the signed-in user's password")
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request, HttpSession session) {
        Object userId = session.getAttribute("userId");
        if (!(userId instanceof Long id)) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED);
        authService.changePassword(id, request.currentPassword(), request.newPassword());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpSession session) { session.invalidate(); }
}
