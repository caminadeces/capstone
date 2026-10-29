package com.capstone.core_service.repository;

import com.capstone.core_service.model.Ingredient;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** Persistence operations for the shared ingredient catalog. */
public interface IngredientRepository extends JpaRepository<Ingredient, Long> {
    /** Finds an ingredient by its normalized, case-insensitive name. */
    Optional<Ingredient> findByNormalizedName(String normalizedName);
}
