package com.capstone.core_service.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(name = "app_user", uniqueConstraints = @UniqueConstraint(columnNames = "email"))
public class AppUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    /** JPA-only constructor. */
    protected AppUser() {}
    /** Creates an account from an email address and encoded password. */
    public AppUser(String email, String passwordHash) {
        this.email = email;
        this.passwordHash = passwordHash;
    }
    /** Returns the persisted user ID. */
    public Long getId() {
        return id;
    }
    /** Returns the user's email address. */
    public String getEmail() {
        return email;
    }
    /** Returns the encoded password hash; do not expose it in API responses. */
    public String getPasswordHash() {
        return passwordHash;
    }
    /** Returns when the account was created. */
    public Instant getCreatedAt() {
        return createdAt;
    }
}
