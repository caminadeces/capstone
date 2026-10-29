package com.capstone.core_service.repository;

import com.capstone.core_service.model.GroceryListItem;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** Persistence operations for grocery list items. */
public interface GroceryListItemRepository extends JpaRepository<GroceryListItem, Long> {
    /** Finds an item by ID only when its list has the specified ID and owner. */
    Optional<GroceryListItem> findByIdAndGroceryListIdAndGroceryListOwnerId(
            Long id, Long listId, Long ownerId);
}
