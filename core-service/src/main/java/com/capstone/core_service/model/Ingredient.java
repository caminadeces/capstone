package com.capstone.core_service.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "ingredient",
        uniqueConstraints = @UniqueConstraint(columnNames = "normalized_name"))
/** Shared ingredient catalog entry with a case-insensitive normalized lookup key. */
public class Ingredient {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "normalized_name", nullable = false, length = 120)
    private String normalizedName;

    /** JPA-only constructor. */
    protected Ingredient() {}

    /** Creates an ingredient and derives its normalized lookup name. */
    public Ingredient(String name) {
        this.name = name.trim();
        this.normalizedName = name.trim().toLowerCase(java.util.Locale.ROOT);
    }

    /** Returns the persisted ingredient ID. */
    public Long getId() {
        return id;
    }
    /** Returns the display name of the ingredient. */
    public String getName() {
        return name;
    }
}
