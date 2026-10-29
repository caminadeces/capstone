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
        name = "recipe_ingredient",
        uniqueConstraints = @UniqueConstraint(columnNames = {"recipe_id", "ingredient_id"}))
/** Join entity recording an ingredient's quantity and unit in a recipe. */
public class RecipeIngredient {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipe_id", nullable = false)
    private Recipe recipe;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    @Column(nullable = false, precision = 10, scale = 3)
    private BigDecimal quantity;

    @Column(nullable = false, length = 32)
    private String unit;

    /** JPA-only constructor. */
    protected RecipeIngredient() {}

    /** Creates a recipe ingredient association with its quantity and unit. */
    public RecipeIngredient(Ingredient ingredient, BigDecimal quantity, String unit) {
        this.ingredient = ingredient;
        this.quantity = quantity;
        this.unit = unit.trim();
    }

    /** Sets the owning recipe association. */
    public void setRecipe(Recipe recipe) {
        this.recipe = recipe;
    }
    /** Returns the referenced ingredient. */
    public Ingredient getIngredient() {
        return ingredient;
    }
    /** Returns the measured amount of the ingredient. */
    public BigDecimal getQuantity() {
        return quantity;
    }
    /** Returns the measurement unit. */
    public String getUnit() {
        return unit;
    }
}
