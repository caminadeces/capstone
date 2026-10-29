package com.capstone.user_auth_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Credentials used to log in")
/** Validated email and password submitted to the login endpoint. */
public record LoginRequest(
        @Schema(description = "User email address", example = "jane@example.com") @NotBlank @Email String email,
        @Schema(description = "Account password", example = "correct-horse-42") @NotBlank String password) {}
