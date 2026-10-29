package com.capstone.core_service.controller;

import com.capstone.core_service.model.MealPlan;
import com.capstone.core_service.service.MealPlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Authenticated endpoints for managing the current user's meal plans. */
@RestController
@RequestMapping("/api/meal-plans")
@Tag(name = "Meal plans", description = "Manage the authenticated user's meal plans")
@SecurityRequirement(name = "bearerAuth")
public class MealPlanController {
    private final MealPlanService mealPlans;

    /** Creates the controller with the meal-plan workflow service. */
    public MealPlanController(MealPlanService mealPlans) {
        this.mealPlans = mealPlans;
    }

    /** Meal-plan fields accepted when creating or replacing a plan. */
    @Schema(description = "Meal plan details; recipe IDs must belong to the authenticated user")
    public record PlanInput(
            @Schema(description = "Meal plan name") @NotBlank @Size(max = 160) String name,
            @Schema(description = "Optional description") @Size(max = 2000) String description,
            @Schema(description = "IDs of recipes owned by the authenticated user")
                    java.util.List<Long> recipeIds,
            @Schema(description = "Optional first date in the plan", example = "2026-06-01")
                    LocalDate startDate,
            @Schema(description = "Optional last date in the plan", example = "2026-06-07")
                    LocalDate endDate) {}

    /** Public representation of a meal plan and its planned recipes. */
    public record PlanView(
            @Schema(description = "Meal plan identifier") Long id,
            @Schema(description = "Meal plan name") String name,
            String description,
            java.util.List<MealRecipeView> recipes,
            LocalDate startDate,
            LocalDate endDate,
            @Schema(description = "Creation timestamp in ISO-8601 format") Instant createdAt) {}

    /** Lists the authenticated user's meal plans. */
    @GetMapping
    @Operation(summary = "List the current user's meal plans")
    public java.util.List<PlanView> list(Authentication authentication) {
        return mealPlans.findAllForUser(userId(authentication)).stream()
                .map(MealPlanController::view)
                .toList();
    }

    /** Gets an owned meal plan, or returns 404 when it does not exist. */
    @GetMapping("/{id}")
    @Operation(summary = "Get a meal plan owned by the current user")
    public ResponseEntity<?> get(@PathVariable Long id, Authentication authentication) {
        try {
            return ResponseEntity.ok(view(mealPlans.findForUser(userId(authentication), id)));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Creates a meal plan and associates the requested owned recipes. */
    @PostMapping
    @Operation(summary = "Create a meal plan for the current user")
    public ResponseEntity<?> create(
            @Valid @RequestBody PlanInput input, Authentication authentication) {
        try {
            MealPlan plan =
                    mealPlans.createForUser(
                            userId(authentication),
                            input.name(),
                            input.description(),
                            input.startDate(),
                            input.endDate());
            plan.replaceRecipes(resolveRecipes(userId(authentication), input.recipeIds()));
            return ResponseEntity.status(HttpStatus.CREATED).body(view(plan));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest()
                    .body(java.util.Map.of("error", exception.getMessage()));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    /** Replaces an owned meal plan's fields and planned recipes. */
    @PutMapping("/{id}")
    @Operation(summary = "Update a meal plan owned by the current user")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @Valid @RequestBody PlanInput input,
            Authentication authentication) {
        try {
            MealPlan plan =
                    mealPlans.updateForUser(
                            userId(authentication),
                            id,
                            input.name(),
                            input.description(),
                            input.startDate(),
                            input.endDate());
            plan.replaceRecipes(resolveRecipes(userId(authentication), input.recipeIds()));
            return ResponseEntity.ok(view(plan));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest()
                    .body(java.util.Map.of("error", exception.getMessage()));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Deletes an owned meal plan, or returns 404 when it does not exist. */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a meal plan owned by the current user")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        try {
            mealPlans.deleteForUser(userId(authentication), id);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Maps the entity and planned recipes to the API response representation. */
    private static PlanView view(MealPlan plan) {
        java.util.List<MealRecipeView> recipes =
                plan.getRecipes().stream()
                        .map(
                                recipe ->
                                        new MealRecipeView(
                                                recipe.getRecipe().getId(),
                                                recipe.getRecipe().getTitle(),
                                                recipe.getServings()))
                        .toList();
        return new PlanView(
                plan.getId(),
                plan.getName(),
                plan.getDescription(),
                recipes,
                plan.getStartDate(),
                plan.getEndDate(),
                plan.getCreatedAt());
    }

    /** Planned recipe summary included in a meal plan response. */
    public record MealRecipeView(
            @Schema(description = "Recipe identifier") Long recipeId,
            @Schema(description = "Recipe title") String title,
            @Schema(description = "Planned servings") BigDecimal servings) {}

    /**
     * Resolves recipe IDs for the user and creates associations using each recipe's default serving
     * count.
     */
    private java.util.List<com.capstone.core_service.model.MealPlanRecipe> resolveRecipes(
            Long userId, java.util.List<Long> recipeIds) {
        if (recipeIds == null) {
            return java.util.List.of();
        }
        return recipeIds.stream()
                .map(
                        recipeId -> {
                            var recipe = mealPlans.findRecipeForUser(userId, recipeId);
                            int servings = recipe.getServings() == null ? 1 : recipe.getServings();
                            return new com.capstone.core_service.model.MealPlanRecipe(
                                    recipe, java.math.BigDecimal.valueOf(servings));
                        })
                .toList();
    }

    /** Reads the authenticated user's database ID from the security principal. */
    private Long userId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
