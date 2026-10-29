package com.capstone.user_auth_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Details required to create a user account")
/** Validated data submitted to create a user account. */
public record RegisterRequest(
        @Schema(description = "User email address", example = "jane@example.com")
        @NotBlank @Email @Size(max = 254) String email,
        @Schema(description = "User's display name", example = "Jane Doe")
        @NotBlank @Size(max = 100) String name,
        @Schema(description = "Password (8 to 72 characters)", example = "correct-horse-42", minLength = 8, maxLength = 72)
        @NotBlank @Size(min = 8, max = 72) String password) {}
