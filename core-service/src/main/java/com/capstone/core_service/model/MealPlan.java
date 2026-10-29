package com.capstone.core_service.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.CascadeType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** A user's meal plan with an optional date range and planned recipes. */
@Entity
@Table(name = "meal_plan")
public class MealPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AppUser owner;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 2000)
    private String description;

    private LocalDate startDate;
    private LocalDate endDate;

    @OneToMany(mappedBy = "mealPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<MealPlanRecipe> recipes = new ArrayList<>();

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    /** JPA-only constructor. */
    protected MealPlan() {}

    /** Creates a meal plan for an owner, including its optional date range. */
    public MealPlan(
            AppUser owner,
            String name,
            String description,
            LocalDate startDate,
            LocalDate endDate) {
        this.owner = owner;
        this.name = name;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    /** Returns the persisted meal-plan ID. */
    public Long getId() {
        return id;
    }

    /** Returns the meal-plan name. */
    public String getName() {
        return name;
    }

    /** Returns the optional description. */
    public String getDescription() {
        return description;
    }

    /** Returns an immutable snapshot of planned recipe associations. */
    public List<MealPlanRecipe> getRecipes() {
        return List.copyOf(recipes);
    }

    /** Replaces planned recipes and updates each association's owning side. */
    public void replaceRecipes(List<MealPlanRecipe> recipes) {
        this.recipes.clear();
        for (MealPlanRecipe recipe : recipes) {
            this.recipes.add(recipe);
            recipe.setMealPlan(this);
        }
    }

    /** Returns the optional start date. */
    public LocalDate getStartDate() {
        return startDate;
    }

    /** Returns the optional end date. */
    public LocalDate getEndDate() {
        return endDate;
    }

    /** Returns when the meal plan was created. */
    public Instant getCreatedAt() {
        return createdAt;
    }

    /** Replaces the meal-plan name, description, and date range. */
    public void update(
            String name,
            String description,
            LocalDate startDate,
            LocalDate endDate) {
        this.name = name;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
    }
}
