package com.capstone.core_service.repository;

import com.capstone.core_service.model.GroceryList;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** Persistence operations for grocery lists, including owner-scoped lookups. */
public interface GroceryListRepository extends JpaRepository<GroceryList, Long> {
    /** Lists a user's grocery lists in descending creation order. */
    List<GroceryList> findAllByOwnerIdOrderByCreatedAtDesc(Long ownerId);
    /** Finds a grocery list by ID only when it belongs to the given user. */
    Optional<GroceryList> findByIdAndOwnerId(Long id, Long ownerId);
}
