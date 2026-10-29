package com.capstone.core_service.repository;
import com.capstone.core_service.model.AppUser;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** Persistence operations for user accounts. */
public interface UserRepository extends JpaRepository<AppUser, Long> {
    /** Finds an account by its email address. */
    Optional<AppUser> findByEmail(String email);
}
