package com.capstone.core_service.controller;

import com.capstone.core_service.model.Ingredient;
import com.capstone.core_service.model.Recipe;
import com.capstone.core_service.model.RecipeIngredient;
import com.capstone.core_service.repository.IngredientRepository;
import com.capstone.core_service.repository.RecipeRepository;
import com.capstone.core_service.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
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

/** Authenticated endpoints for recipes owned by the current user. */
@RestController
@RequestMapping("/api/recipes")
@Tag(name = "Recipes", description = "Manage recipes belonging to the authenticated user")
@SecurityRequirement(name = "bearerAuth")
public class RecipeController {
    private final RecipeRepository recipes;
    private final UserRepository users;
    private final IngredientRepository ingredients;

    /** Creates the controller with recipe, user, and ingredient persistence dependencies. */
    public RecipeController(
            RecipeRepository recipes, UserRepository users, IngredientRepository ingredients) {
        this.recipes = recipes;
        this.users = users;
        this.ingredients = ingredients;
    }

    /** Ingredient name, amount, and unit supplied with a recipe. */
    @Schema(description = "Ingredient and quantity used by a recipe")
    public record IngredientInput(
            @Schema(description = "Ingredient display name", example = "Flour")
                    @NotBlank @Size(max = 120) String name,
            @Schema(description = "Amount, greater than zero", example = "2.5")
                    @NotNull @DecimalMin(value = "0.001") @Digits(integer = 7, fraction = 3)
                    BigDecimal quantity,
            @Schema(description = "Measurement unit", example = "cup")
                    @NotBlank @Size(max = 32) String unit) {}

    /** Recipe fields accepted when creating or replacing a recipe. */
    @Schema(description = "Recipe data; ingredients may be omitted or supplied as an empty list")
    public record RecipeInput(
            @Schema(description = "Recipe title", example = "Vegetable soup")
                    @NotBlank @Size(max = 160) String title,
            @Schema(description = "Optional short description") @Size(max = 4000) String description,
            @Schema(description = "Ingredient quantities") @Valid List<IngredientInput> ingredients,
            @Schema(description = "Preparation instructions") @Size(max = 12000) String instructions,
            @Schema(description = "Preparation time in minutes", example = "30") @Min(0)
                    Integer prepMinutes,
            @Schema(description = "Number of servings", example = "4") @Min(1) Integer servings) {}

    /** Ingredient data returned as part of a recipe. */
    public record IngredientView(
            @Schema(description = "Ingredient identifier") Long id,
            @Schema(description = "Ingredient display name") String name,
            @Schema(description = "Ingredient amount") BigDecimal quantity,
            @Schema(description = "Measurement unit") String unit) {}

    /** Public recipe representation returned by this API. */
    public record RecipeView(
            @Schema(description = "Recipe identifier") Long id,
            @Schema(description = "Recipe title") String title,
            String description,
            List<IngredientView> ingredients,
            String instructions,
            @Schema(description = "Preparation time in minutes") Integer prepMinutes,
            Integer servings,
            @Schema(description = "Creation timestamp in ISO-8601 format") Instant createdAt) {}

    /** Converts a recipe entity and its ingredients to the API response shape. */
    private RecipeView view(Recipe recipe) {
        List<IngredientView> ingredientViews =
                recipe.getIngredients().stream()
                        .map(
                                ingredient ->
                                        new IngredientView(
                                                ingredient.getIngredient().getId(),
                                                ingredient.getIngredient().getName(),
                                                ingredient.getQuantity(),
                                                ingredient.getUnit()))
                        .toList();
        return new RecipeView(
                recipe.getId(),
                recipe.getTitle(),
                recipe.getDescription(),
                ingredientViews,
                recipe.getInstructions(),
                recipe.getPrepMinutes(),
                recipe.getServings(),
                recipe.getCreatedAt());
    }

    /** Lists the authenticated user's recipes from newest to oldest. */
    @GetMapping
    @Operation(summary = "List the current user's recipes")
    public List<RecipeView> list(Authentication authentication) {
        return recipes.findAllByOwnerIdOrderByCreatedAtDesc(userId(authentication)).stream()
                .map(this::view)
                .toList();
    }

    /** Gets one recipe owned by the authenticated user, or returns 404. */
    @GetMapping("/{id}")
    @Operation(summary = "Get a recipe owned by the current user")
    public ResponseEntity<?> get(@PathVariable Long id, Authentication authentication) {
        return recipes.findByIdAndOwnerId(id, userId(authentication))
                .<ResponseEntity<?>>map(recipe -> ResponseEntity.ok(view(recipe)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Creates a recipe for the authenticated user and returns it with status 201. */
    @PostMapping
    @Operation(summary = "Create a recipe for the current user")
    public ResponseEntity<?> create(
            @Valid @RequestBody RecipeInput input, Authentication authentication) {
        Recipe recipe =
                new Recipe(
                        users.getReferenceById(userId(authentication)),
                        input.title(),
                        input.description(),
                        input.instructions(),
                        input.prepMinutes(),
                        input.servings());
        recipe.replaceIngredients(toEntities(input.ingredients()));
        return ResponseEntity.status(HttpStatus.CREATED).body(view(recipes.save(recipe)));
    }

    /** Replaces a recipe's fields and ingredients when it belongs to the current user. */
    @PutMapping("/{id}")
    @Operation(summary = "Replace a recipe owned by the current user")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @Valid @RequestBody RecipeInput input,
            Authentication authentication) {
        return recipes.findByIdAndOwnerId(id, userId(authentication))
                .<ResponseEntity<?>>map(
                        recipe -> {
                            recipe.update(
                                    input.title(),
                                    input.description(),
                                    input.instructions(),
                                    input.prepMinutes(),
                                    input.servings());
                            recipe.replaceIngredients(toEntities(input.ingredients()));
                            return ResponseEntity.ok(view(recipe));
                        })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Deletes a recipe owned by the current user, returning 404 when absent. */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a recipe owned by the current user")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
        return recipes.findByIdAndOwnerId(id, userId(authentication))
                .<ResponseEntity<?>>map(
                        recipe -> {
                            recipes.delete(recipe);
                            return ResponseEntity.noContent().build();
                        })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Reads the authenticated user's database ID from the security principal. */
    private Long userId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }

    /** Resolves or creates normalized ingredient records and maps inputs to recipe associations. */
    private List<RecipeIngredient> toEntities(List<IngredientInput> inputs) {
        if (inputs == null) {
            return List.of();
        }
        return inputs.stream()
                .map(
                        input -> {
                            String name = input.name().trim();
                            Ingredient ingredient =
                                    ingredients
                                            .findByNormalizedName(name.toLowerCase(Locale.ROOT))
                                            .orElseGet(() -> ingredients.save(new Ingredient(name)));
                            return new RecipeIngredient(
                                    ingredient, input.quantity(), input.unit());
                        })
                .toList();
    }
}
