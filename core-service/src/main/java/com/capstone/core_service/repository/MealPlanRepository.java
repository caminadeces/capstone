package com.capstone.core_service.repository;

import com.capstone.core_service.model.MealPlan;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** Persistence operations for meal plans, including owner-scoped lookups. */
public interface MealPlanRepository extends JpaRepository<MealPlan, Long> {
    /** Lists a user's meal plans in descending creation order. */
    List<MealPlan> findAllByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    /** Finds a meal plan by ID only when it belongs to the given user. */
    Optional<MealPlan> findByIdAndOwnerId(Long id, Long ownerId);
}
