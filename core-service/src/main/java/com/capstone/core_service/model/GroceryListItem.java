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
        name = "grocery_list_item",
        uniqueConstraints =
                @UniqueConstraint(columnNames = {"grocery_list_id", "ingredient_id", "unit"}))
/** An ingredient, quantity, unit, and checked state in a grocery list. */
public class GroceryListItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "grocery_list_id", nullable = false)
    private GroceryList groceryList;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    @Column(nullable = false, precision = 10, scale = 3)
    private BigDecimal quantity;

    @Column(nullable = false, length = 32)
    private String unit;

    @Column(nullable = false)
    private boolean checked;

    /** JPA-only constructor. */
    protected GroceryListItem() {}
    /** Creates an unchecked grocery item for the given ingredient quantity. */
    public GroceryListItem(Ingredient ingredient, BigDecimal quantity, String unit) {
        this.ingredient = ingredient;
        this.quantity = quantity;
        this.unit = unit.trim();
    }
    /** Sets the owning grocery-list association. */
    public void setGroceryList(GroceryList groceryList) {
        this.groceryList = groceryList;
    }
    /** Returns the persisted item ID. */
    public Long getId() {
        return id;
    }
    /** Returns the referenced ingredient. */
    public Ingredient getIngredient() {
        return ingredient;
    }
    /** Returns the requested quantity. */
    public BigDecimal getQuantity() {
        return quantity;
    }
    /** Returns the quantity unit. */
    public String getUnit() {
        return unit;
    }
    /** Returns whether the item is checked off. */
    public boolean isChecked() {
        return checked;
    }
    /** Sets whether the item is checked off. */
    public void setChecked(boolean checked) {
        this.checked = checked;
    }
    /** Replaces the item quantity, for example when aggregating recipe ingredients. */
    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }
}
