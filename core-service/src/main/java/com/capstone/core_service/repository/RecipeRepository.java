package com.capstone.core_service.repository;
import com.capstone.core_service.model.Recipe;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** Persistence operations for recipes, including owner-scoped lookups. */
public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    /** Lists a user's recipes in descending creation order. */
    List<Recipe> findAllByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    /** Finds a recipe by ID only when it belongs to the given user. */
    Optional<Recipe> findByIdAndOwnerId(Long id, Long ownerId);
}
