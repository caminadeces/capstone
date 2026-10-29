package com.capstone.core_service.security;

import com.capstone.core_service.repository.UserRepository;
import com.capstone.core_service.service.TokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
/**
 * Extracts bearer tokens and populates the Spring Security context for valid
 * users.
 */
public class AuthFilter extends OncePerRequestFilter {
    private final TokenService tokens;
    private final UserRepository users;

    /** Creates the filter with token validation and user lookup dependencies. */
    public AuthFilter(TokenService tokens, UserRepository users) {
        this.tokens = tokens;
        this.users = users;
    }

    /**
     * Authenticates an existing user from a valid bearer token, then continues the
     * filter chain.
     */
    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            Long userId = tokens.verify(header.substring(7));
            if (userId != null) {
                users.findById(userId)
                        .ifPresent(
                                user -> SecurityContextHolder.getContext()
                                        .setAuthentication(
                                                new UsernamePasswordAuthenticationToken(
                                                        user.getId(),
                                                        null,
                                                        java.util.List.of())));
            }
            chain.doFilter(request, response);
        }
    }
}
