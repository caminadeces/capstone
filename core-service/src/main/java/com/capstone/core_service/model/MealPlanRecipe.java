package com.capstone.core_service.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;

@Entity
@Table(
        name = "meal_plan_recipe",
        uniqueConstraints = @UniqueConstraint(columnNames = {"meal_plan_id", "recipe_id"}))
/** Join entity recording a recipe and serving count in a meal plan. */
public class MealPlanRecipe {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meal_plan_id", nullable = false)
    private MealPlan mealPlan;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipe_id", nullable = false)
    private Recipe recipe;

    @Column(nullable = false, precision = 7, scale = 2)
    private BigDecimal servings;

    /** JPA-only constructor. */
    protected MealPlanRecipe() {}
    /** Creates a meal-plan recipe association with the planned serving count. */
    public MealPlanRecipe(Recipe recipe, BigDecimal servings) {
        this.recipe = recipe;
        this.servings = servings;
    }
    /** Sets the owning meal-plan association. */
    public void setMealPlan(MealPlan mealPlan) {
        this.mealPlan = mealPlan;
    }
    /** Returns the associated recipe. */
    public Recipe getRecipe() {
        return recipe;
    }
    /** Returns the number of servings planned. */
    public BigDecimal getServings() {
        return servings;
    }
}
