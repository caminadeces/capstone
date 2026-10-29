package com.capstone.user_auth_service.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "app_user")
/** Persistent user account. The password field stores an encoded value, never plaintext. */
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private String passwordHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** Required by JPA when loading an entity from the database. */
    protected User() {}

    /** Creates a user account.
     * @param email normalized email address
     * @param name display name
     * @param passwordHash encoded password value
     */
    public User(String email, String name, String passwordHash) {
        this.email = email;
        this.name = name;
        this.passwordHash = passwordHash;
    }

    @PrePersist
    private void setCreatedAtIfMissing() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    /** @return database identifier */
    public Long getId() { return id; }
    /** @return normalized email address */
    public String getEmail() { return email; }
    /** @return account display name */
    public String getName() { return name; }
    /** @return encoded password value */
    public String getPasswordHash() { return passwordHash; }
    /** Replaces the stored password hash with a newly encoded value. */
    public void changePasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    /** @return account creation timestamp */
    public Instant getCreatedAt() { return createdAt; }
}
