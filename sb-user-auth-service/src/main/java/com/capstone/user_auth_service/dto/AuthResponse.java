package com.capstone.user_auth_service.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Public user details returned after successful authentication")
/** Public response returned after registration or successful login. */
public record AuthResponse(Long id, String email, String name, String message) {}
