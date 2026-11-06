package myapp.feature;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/** Read-only credentials view; never return this entity from an HTTP endpoint. */
@Entity
@Immutable
@Table(name = "users")
public class FeatureAccount {
    @Id @Column(name = "user_id")
    private Integer id;
    @Column(name = "email", nullable = false, length = 255)
    private String email;
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;
    @Column(name = "role", nullable = false, length = 30)
    private String role;
    @Column(name = "status", nullable = false, length = 20)
    private String status;
    @Column(name = "deleted", nullable = false)
    private boolean deleted;
    protected FeatureAccount() {}
    public Integer getId() { return id; }
    public String getPasswordHash() { return passwordHash; }
    public String getRole() { return role; }
    public boolean canSignIn() { return !deleted && "ACTIVE".equals(status); }
}
