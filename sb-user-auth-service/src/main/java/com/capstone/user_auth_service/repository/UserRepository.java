package com.capstone.user_auth_service.repository;

import com.capstone.user_auth_service.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Database access operations for {@link User} accounts. */
public interface UserRepository extends JpaRepository<User, Long> {
    /** Finds an account by its normalized email address.
     * @param email normalized email address
     * @return matching account, or empty when none exists
     */
    Optional<User> findByEmail(String email);

    /** Checks whether an account already uses the given normalized email.
     * @param email normalized email address
     * @return {@code true} if an account exists for the email
     */
    boolean existsByEmail(String email);
}
