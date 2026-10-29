package com.capstone.core_service.service;

import com.capstone.core_service.model.AppUser;
import com.capstone.core_service.model.MealPlan;
import com.capstone.core_service.model.Recipe;
import com.capstone.core_service.repository.MealPlanRepository;
import com.capstone.core_service.repository.RecipeRepository;
import com.capstone.core_service.repository.UserRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

@Service
@Transactional
/** Coordinates meal-plan operations and enforces owner-scoped access. */
public class MealPlanService {
    private final MealPlanRepository mealPlans;
    private final UserRepository users;
    private final RecipeRepository recipes;

    /** Creates the service with meal-plan, user, and recipe persistence dependencies. */
    public MealPlanService(
            MealPlanRepository mealPlans, UserRepository users, RecipeRepository recipes) {
        this.mealPlans = mealPlans;
        this.users = users;
        this.recipes = recipes;
    }

    /** Finds a recipe only when it belongs to the specified user. */
    public Recipe findRecipeForUser(Long userId, Long recipeId) {
        return recipes.findByIdAndOwnerId(recipeId, userId)
                .orElseThrow(() -> new NoSuchElementException("Recipe not found"));
    }

    /** Returns the user's meal plans ordered by creation time descending. */
    @Transactional(readOnly = true)
    public List<MealPlan> findAllForUser(Long userId) {
        return mealPlans.findAllByOwnerIdOrderByCreatedAtDesc(userId);
    }

    /** Finds a meal plan owned by the user or throws when it does not exist. */
    @Transactional(readOnly = true)
    public MealPlan findForUser(Long userId, Long mealPlanId) {
        return mealPlans.findByIdAndOwnerId(mealPlanId, userId)
                .orElseThrow(() -> new NoSuchElementException("Meal plan not found"));
    }

    /** Creates a meal plan after validating its date range and resolving its owner. */
    public MealPlan createForUser(
            Long userId,
            String name,
            String description,
            LocalDate startDate,
            LocalDate endDate) {
        validateDates(startDate, endDate);
        AppUser owner =
                users.findById(userId)
                        .orElseThrow(() -> new NoSuchElementException("User not found"));
        return mealPlans.save(new MealPlan(owner, name, description, startDate, endDate));
    }

    /** Updates an owned meal plan after validating its date range. */
    public MealPlan updateForUser(
            Long userId,
            Long mealPlanId,
            String name,
            String description,
            LocalDate startDate,
            LocalDate endDate) {
        validateDates(startDate, endDate);
        MealPlan plan = findForUser(userId, mealPlanId);
        plan.update(name, description, startDate, endDate);
        return plan;
    }

    /** Deletes the specified user's meal plan. */
    public void deleteForUser(Long userId, Long mealPlanId) {
        mealPlans.delete(findForUser(userId, mealPlanId));
    }

    /** Rejects a date range whose end date is earlier than its start date. */
    private void validateDates(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("endDate must be on or after startDate");
        }
    }
}
