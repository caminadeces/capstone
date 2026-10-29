package com.capstone.core_service.controller;

import com.capstone.core_service.model.GroceryList;
import com.capstone.core_service.model.GroceryListItem;
import com.capstone.core_service.service.GroceryListService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Authenticated endpoints for grocery lists and their items. */
@RestController
@RequestMapping("/api/grocery-lists")
@Tag(name = "Grocery lists", description = "Manage grocery lists and generate ingredients from recipes")
@SecurityRequirement(name = "bearerAuth")
public class GroceryListController {
    private final GroceryListService groceryLists;

    /** Creates the controller with the grocery-list workflow service. */
    public GroceryListController(GroceryListService groceryLists) {
        this.groceryLists = groceryLists;
    }

    /** Name supplied when creating a grocery list. */
    @Schema(description = "Grocery list creation fields")
    public record ListInput(
            @Schema(description = "Name for the new list") @NotBlank @Size(max = 160) String name) {}

    /** Recipe source and new list name, with an optional target serving count. */
    public record RecipeSourceInput(
            @Schema(description = "Recipe identifier; recipe must belong to the authenticated user")
                    @NotNull Long recipeId,
            @Schema(description = "Name for the new list") @NotBlank @Size(max = 160) String name,
            @Schema(description = "Optional target serving count used to scale ingredient amounts")
                    @DecimalMin(value = "0.1") @Digits(integer = 5, fraction = 2)
                    BigDecimal servings) {}

    /** Meal-plan source and new list name. */
    public record MealPlanSourceInput(
            @Schema(description = "Meal plan identifier owned by the authenticated user")
                    @NotNull Long mealPlanId,
            @Schema(description = "Name for the new list") @NotBlank @Size(max = 160) String name) {}

    /** Ingredient and quantity fields for adding a manual list item. */
    public record ItemInput(
            @Schema(description = "Ingredient name") @NotBlank @Size(max = 120) String ingredient,
            @Schema(description = "Amount, greater than zero")
                    @NotNull @DecimalMin(value = "0.001") @Digits(integer = 7, fraction = 3)
                    BigDecimal quantity,
            @Schema(description = "Measurement unit") @NotBlank @Size(max = 32) String unit) {}

    /** Desired checked state for a grocery item. */
    public record CheckedInput(
            @Schema(description = "Whether the item should be marked checked") boolean checked) {}

    /** Public representation of a grocery list item. */
    public record ItemView(
            Long id,
            Long ingredientId,
            String ingredient,
            BigDecimal quantity,
            String unit,
            boolean checked) {}

    /** Public representation of a grocery list and its items. */
    public record ListView(
            Long id, String name, java.time.Instant createdAt, java.util.List<ItemView> items) {}

    /** Lists the authenticated user's grocery lists. */
    @GetMapping
    @Operation(summary = "List the current user's grocery lists")
    public java.util.List<ListView> list(Authentication auth) {
        return groceryLists.findAll(userId(auth)).stream()
                .map(GroceryListController::view)
                .toList();
    }

    /** Gets an owned grocery list, or returns 404 when it does not exist. */
    @GetMapping("/{id}")
    @Operation(summary = "Get a grocery list")
    public ResponseEntity<?> get(@PathVariable Long id, Authentication auth) {
        try {
            return ResponseEntity.ok(view(groceryLists.find(userId(auth), id)));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Creates an empty grocery list for the authenticated user. */
    @PostMapping
    @Operation(summary = "Create an empty grocery list")
    public ResponseEntity<?> create(@Valid @RequestBody ListInput input, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(view(groceryLists.create(userId(auth), input.name())));
    }

    /** Creates a grocery list from an owned recipe and optionally scales amounts to the requested servings. */
    @PostMapping("/from-recipe")
    @Operation(summary = "Create a grocery list from a recipe, optionally scaling servings")
    public ResponseEntity<?> fromRecipe(@Valid @RequestBody RecipeSourceInput input, Authentication auth) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(
                            view(
                                    groceryLists.createFromRecipe(
                                            userId(auth),
                                            input.recipeId(),
                                            input.name(),
                                            input.servings())));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest()
                    .body(java.util.Map.of("error", exception.getMessage()));
        }
    }

    /** Creates a grocery list from the authenticated user's meal plan. */
    @PostMapping("/from-meal-plan")
    @Operation(summary = "Create a grocery list from a meal plan")
    public ResponseEntity<?> fromMealPlan(@Valid @RequestBody MealPlanSourceInput input, Authentication auth) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(
                            view(
                                    groceryLists.createFromMealPlan(
                                            userId(auth), input.mealPlanId(), input.name())));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest()
                    .body(java.util.Map.of("error", exception.getMessage()));
        }
    }

    /** Adds an owned recipe's ingredients to an existing list, optionally scaled to servings. */
    @PostMapping("/{id}/recipes/{recipeId}")
    @Operation(summary = "Add a recipe's ingredients to an existing list, aggregating matching units")
    public ResponseEntity<?> addRecipe(
            @PathVariable Long id,
            @PathVariable Long recipeId,
            @jakarta.validation.constraints.DecimalMin(value = "0.1")
                    @jakarta.validation.constraints.Digits(integer = 5, fraction = 2)
                    @org.springframework.web.bind.annotation.RequestParam(required = false)
                    BigDecimal servings,
            Authentication auth) {
        try {
            return ResponseEntity.ok(
                    view(groceryLists.addRecipe(userId(auth), id, recipeId, servings)));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest()
                    .body(java.util.Map.of("error", exception.getMessage()));
        }
    }

    /** Adds a manually entered ingredient to an owned list. */
    @PostMapping("/{id}/items")
    @Operation(summary = "Add an ingredient to a grocery list")
    public ResponseEntity<?> addItem(
            @PathVariable Long id, @Valid @RequestBody ItemInput input, Authentication auth) {
        try {
            groceryLists.addItem(
                    userId(auth), id, input.ingredient(), input.quantity(), input.unit());
            return ResponseEntity.ok(view(groceryLists.find(userId(auth), id)));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Changes the checked state of an item on an owned list. */
    @PatchMapping("/{listId}/items/{itemId}")
    @Operation(summary = "Mark a grocery item checked or unchecked")
    public ResponseEntity<?> setChecked(@PathVariable Long listId, @PathVariable Long itemId,
            @Valid @RequestBody CheckedInput input, Authentication auth) {
        try {
            GroceryListItem item =
                    groceryLists.setChecked(userId(auth), listId, itemId, input.checked());
            return ResponseEntity.ok(
                    new ItemView(
                            item.getId(),
                            item.getIngredient().getId(),
                            item.getIngredient().getName(),
                            item.getQuantity(),
                            item.getUnit(),
                            item.isChecked()));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Deletes an owned grocery list. */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a grocery list")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        try {
            groceryLists.delete(userId(auth), id);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Maps a grocery-list entity and its items to the public response representation. */
    private static ListView view(GroceryList list) {
        return new ListView(
                list.getId(),
                list.getName(),
                list.getCreatedAt(),
                list.getItems().stream()
                        .map(
                                item ->
                                        new ItemView(
                                                item.getId(),
                                                item.getIngredient().getId(),
                                                item.getIngredient().getName(),
                                                item.getQuantity(),
                                                item.getUnit(),
                                                item.isChecked()))
                        .toList());
    }

    /** Reads the authenticated user's database ID from the security principal. */
    private Long userId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
