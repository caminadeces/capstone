package com.capstone.core_service.service;

import com.capstone.core_service.model.GroceryList;
import com.capstone.core_service.model.GroceryListItem;
import com.capstone.core_service.model.Ingredient;
import com.capstone.core_service.model.Recipe;
import com.capstone.core_service.model.RecipeIngredient;
import com.capstone.core_service.repository.GroceryListItemRepository;
import com.capstone.core_service.repository.GroceryListRepository;
import com.capstone.core_service.repository.IngredientRepository;
import com.capstone.core_service.repository.MealPlanRepository;
import com.capstone.core_service.repository.RecipeRepository;
import com.capstone.core_service.repository.UserRepository;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
/** Coordinates grocery-list workflows and recipe ingredient aggregation. */
public class GroceryListService {
    private final GroceryListRepository lists;
    private final GroceryListItemRepository items;
    private final RecipeRepository recipes;
    private final MealPlanRepository mealPlans;
    private final IngredientRepository ingredients;
    private final UserRepository users;

    /** Creates the service with grocery-list, item, ingredient, recipe, and meal-plan dependencies. */
    public GroceryListService(GroceryListRepository lists, GroceryListItemRepository items,
            RecipeRepository recipes, MealPlanRepository mealPlans,
            IngredientRepository ingredients, UserRepository users) {
        this.lists = lists;
        this.items = items;
        this.recipes = recipes;
        this.mealPlans = mealPlans;
        this.ingredients = ingredients;
        this.users = users;
    }

    /** Returns the user's lists ordered by creation time descending. */
    @Transactional(readOnly = true)
    public List<GroceryList> findAll(Long userId) {
        return lists.findAllByOwnerIdOrderByCreatedAtDesc(userId);
    }

    /** Finds a list owned by the user or throws when it does not exist. */
    @Transactional(readOnly = true)
    public GroceryList find(Long userId, Long listId) {
        return lists.findByIdAndOwnerId(listId, userId)
                .orElseThrow(() -> new NoSuchElementException("Grocery list not found"));
    }

    /** Creates an empty grocery list for the specified user. */
    public GroceryList create(Long userId, String name) {
        return lists.save(new GroceryList(users.getReferenceById(userId), name));
    }

    /** Creates a grocery list populated with a recipe, optionally scaling quantities to servings. */
    public GroceryList createFromRecipe(
            Long userId, Long recipeId, String name, BigDecimal servings) {
        Recipe recipe =
                recipes.findByIdAndOwnerId(recipeId, userId)
                        .orElseThrow(() -> new NoSuchElementException("Recipe not found"));
        GroceryList list = create(userId, name);
        addScaledRecipe(list, recipe, servings);
        return list;
    }

    /** Creates a grocery list populated from all recipes in an owned meal plan. */
    public GroceryList createFromMealPlan(Long userId, Long mealPlanId, String name) {
        var plan =
                mealPlans.findByIdAndOwnerId(mealPlanId, userId)
                        .orElseThrow(() -> new NoSuchElementException("Meal plan not found"));
        GroceryList list = create(userId, name);
        for (var plannedRecipe : plan.getRecipes()) {
            addScaledRecipe(list, plannedRecipe.getRecipe(), plannedRecipe.getServings());
        }
        return list;
    }

    /** Adds recipe ingredients to an owned list, merging matching ingredients and units. */
    public GroceryList addRecipe(Long userId, Long listId, Long recipeId, BigDecimal servings) {
        GroceryList list = find(userId, listId);
        Recipe recipe =
                recipes.findByIdAndOwnerId(recipeId, userId)
                        .orElseThrow(() -> new NoSuchElementException("Recipe not found"));
        addScaledRecipe(list, recipe, servings);
        return list;
    }

    /**
     * Adds an ingredient with quantity and unit to an owned list, reusing a normalized ingredient
     * if present.
     */
    public GroceryListItem addItem(
            Long userId,
            Long listId,
            String ingredientName,
            BigDecimal quantity,
            String unit) {
        GroceryList list = find(userId, listId);
        String normalized = ingredientName.trim().toLowerCase(Locale.ROOT);
        Ingredient ingredient =
                ingredients
                        .findByNormalizedName(normalized)
                        .orElseGet(() -> ingredients.save(new Ingredient(ingredientName)));
        GroceryListItem item = new GroceryListItem(ingredient, quantity, unit);
        list.addItem(item);
        return item;
    }

    /** Updates the checked state of an item belonging to the user's specified list. */
    public GroceryListItem setChecked(Long userId, Long listId, Long itemId, boolean checked) {
        GroceryListItem item =
                items.findByIdAndGroceryListIdAndGroceryListOwnerId(itemId, listId, userId)
                        .orElseThrow(() -> new NoSuchElementException("Grocery item not found"));
        item.setChecked(checked);
        return item;
    }

    /** Deletes the specified user's grocery list. */
    public void delete(Long userId, Long listId) {
        lists.delete(find(userId, listId));
    }

    /** Scales recipe quantities to requested servings and adds or aggregates their grocery items. */
    private void addScaledRecipe(GroceryList list, Recipe recipe, BigDecimal requestedServings) {
        BigDecimal scale = BigDecimal.ONE;
        if (requestedServings != null) {
            if (recipe.getServings() == null || recipe.getServings() < 1) {
                throw new IllegalArgumentException(
                        "Recipe servings must be set to scale ingredient quantities");
            }
            scale =
                    requestedServings.divide(
                            BigDecimal.valueOf(recipe.getServings()),
                            6,
                            java.math.RoundingMode.HALF_UP);
        }
        Map<String, GroceryListItem> aggregated = new LinkedHashMap<>();
        for (GroceryListItem item : list.getItems()) {
            aggregated.put(key(item.getIngredient(), item.getUnit()), item);
        }
        for (RecipeIngredient source : recipe.getIngredients()) {
            Ingredient ingredient = source.getIngredient();
            String key = key(ingredient, source.getUnit());
            BigDecimal amount = source.getQuantity().multiply(scale);
            GroceryListItem existing = aggregated.get(key);
            if (existing == null) {
                GroceryListItem added = new GroceryListItem(ingredient, amount, source.getUnit());
                list.addItem(added);
                aggregated.put(key, added);
            } else {
                existing.setQuantity(existing.getQuantity().add(amount));
            }
        }
    }

    /** Creates an aggregation key from an ingredient ID and normalized unit. */
    private String key(Ingredient ingredient, String unit) {
        return ingredient.getId() + ":" + unit.trim().toLowerCase(Locale.ROOT);
    }
}
