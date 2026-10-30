package myapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Maps to the existing "category" table (categoryDB.sql).
// We only map the columns this feature needs. JPA ignores the other columns.
@Entity
@Table(name = "category")
public class Category {

    @Id
    @Column(name = "category_id")
    private Integer id;

    @Column(name = "category_name", nullable = false, length = 100)
    private String name;

    // Deactivated categories ("active = 0") should still appear on OLD projects that already
    // use them, but must not be offered when adding or editing a project.
    @Column(name = "active", nullable = false)
    private boolean active;

    // No-argument constructor required by JPA
    public Category() {}

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
