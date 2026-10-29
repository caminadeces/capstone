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
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "grocery_list")
/** A user's named grocery list and its ingredient items. */
public class GroceryList {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AppUser owner;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "groceryList", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GroceryListItem> items = new ArrayList<>();

    /** JPA-only constructor. */
    protected GroceryList() {}
    /** Creates a grocery list owned by the given user. */
    public GroceryList(AppUser owner, String name) {
        this.owner = owner;
        this.name = name.trim();
    }

    /** Returns the persisted list ID. */
    public Long getId() {
        return id;
    }
    /** Returns the user who owns the list. */
    public AppUser getOwner() {
        return owner;
    }
    /** Returns the list name. */
    public String getName() {
        return name;
    }
    /** Returns when the list was created. */
    public Instant getCreatedAt() {
        return createdAt;
    }
    /** Returns an immutable snapshot of the list items. */
    public List<GroceryListItem> getItems() {
        return List.copyOf(items);
    }

    /** Adds an item and sets its owning list association. */
    public void addItem(GroceryListItem item) {
        items.add(item);
        item.setGroceryList(this);
    }
    /** Removes an item from the list. */
    public void removeItem(GroceryListItem item) {
        items.remove(item);
    }
    /** Replaces the list name. */
    public void rename(String name) {
        this.name = name.trim();
    }
}
