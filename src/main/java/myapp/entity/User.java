package myapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Maps to the existing "users" table (usersDB.sql).
// IMPORTANT: we deliberately do NOT map email, phone or password_hash.
// If a column is not in this class, it can never leak out through our API.
@Entity
@Table(name = "users")
public class User {

    @Id
    @Column(name = "user_id")
    private Integer id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    // CUSTOMER, INTERIOR_DESIGNER, USER_ADMIN or PLATFORM_MANAGEMENT
    @Column(name = "role", nullable = false, length = 30)
    private String role;

    // ACTIVE or SUSPENDED
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    // Soft delete flag
    @Column(name = "deleted", nullable = false)
    private boolean deleted;

    // No-argument constructor required by JPA
    public User() {}

    // True only for a designer whose profile customers are allowed to see
    public boolean isActiveDesigner() {
        return "INTERIOR_DESIGNER".equals(role) && "ACTIVE".equals(status) && !deleted;
    }

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }
}
