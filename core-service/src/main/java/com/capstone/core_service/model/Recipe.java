package com.capstone.core_service.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "recipe")
/** A recipe owned by a user, including its instructions and ingredient associations. */
public class Recipe {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AppUser owner;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(length = 4000)
    private String description;

    @Column(length = 12000)
    private String instructions;

    private Integer prepMinutes;
    private Integer servings;

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<RecipeIngredient> ingredients = new ArrayList<>();

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    /** JPA-only constructor. */
    protected Recipe() {}

    /** Creates a recipe for an owner with its descriptive and serving fields. */
    public Recipe(
            AppUser owner,
            String title,
            String description,
            String instructions,
            Integer prepMinutes,
            Integer servings) {
        this.owner = owner;
        this.title = title;
        this.description = description;
        this.instructions = instructions;
        this.prepMinutes = prepMinutes;
        this.servings = servings;
    }

    /** Returns the persisted recipe ID. */
    public Long getId() {
        return id;
    }

    /** Returns the user who owns the recipe. */
    public AppUser getOwner() {
        return owner;
    }

    /** Returns the recipe title. */
    public String getTitle() {
        return title;
    }

    /** Returns the optional recipe description. */
    public String getDescription() {
        return description;
    }

    /** Returns an immutable snapshot of the ingredient associations. */
    public List<RecipeIngredient> getIngredients() {
        return List.copyOf(ingredients);
    }

    /** Returns the optional preparation instructions. */
    public String getInstructions() {
        return instructions;
    }

    /** Returns the optional preparation time in minutes. */
    public Integer getPrepMinutes() {
        return prepMinutes;
    }

    /** Returns the optional number of servings. */
    public Integer getServings() {
        return servings;
    }

    /** Returns when the recipe was created. */
    public Instant getCreatedAt() {
        return createdAt;
    }

    /** Replaces the recipe's descriptive, instruction, and serving fields. */
    public void update(
            String title,
            String description,
            String instructions,
            Integer prepMinutes,
            Integer servings) {
        this.title = title;
        this.description = description;
        this.instructions = instructions;
        this.prepMinutes = prepMinutes;
        this.servings = servings;
    }

    /** Replaces ingredient associations and updates each association's owning side. */
    public void replaceIngredients(List<RecipeIngredient> ingredients) {
        this.ingredients.clear();
        for (RecipeIngredient ingredient : ingredients) {
            this.ingredients.add(ingredient);
            ingredient.setRecipe(this);
        }
    }
}
