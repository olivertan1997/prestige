package myapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Read-only view of the existing "users" table (usersDB.sql), used ONLY by the user search.
// It maps email and phone because the search results show them. It deliberately does NOT
// map password_hash. Your original User.java stays as it is (no email/phone), so the
// designer pages that use User can never leak them.
@Entity
@Table(name = "users")
public class UserSearch {

    @Id
    @Column(name = "user_id")
    private Integer id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "phone", length = 30)
    private String phone;

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
    public UserSearch() {}

    // Getters only: this class is never used to change data
    public Integer getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getRole() { return role; }
    public String getStatus() { return status; }
    public boolean isDeleted() { return deleted; }
}
