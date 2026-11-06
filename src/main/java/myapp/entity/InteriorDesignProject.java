package myapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

// Maps to the existing "interior_design_project" table (interior_design_projectDB.sql).
// Spring does not create or change this table's existing columns, it only reads them.
@Entity
@Table(name = "interior_design_project")
public class InteriorDesignProject {

    @Id
    @Column(name = "idp_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Auto-increments in MySQL, same as Task.java.
    // The 300 seed rows already use explicit ids, so MySQL's own counter is already past them;
    // this annotation only matters for NEW rows created through "manage my projects".
    private Integer id;

    @Column(name = "designer_id", nullable = false)
    private Integer designerId;

    // Read-only relationship for visibility checks; the FK remains controlled by designerId.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "designer_id", insertable = false, updatable = false)
    private User designer;

    // Many projects belong to one category (category_id is the foreign key column)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // 'CURRENT' or 'COMPLETED'
    @Column(name = "project_status", nullable = false, length = 20)
    private String projectStatus;

    @Column(name = "budget", precision = 12, scale = 2)
    private BigDecimal budget;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "location", length = 150)
    private String location;

    // Soft delete flag: true means the project was "deleted" and must never be shown
    @Column(name = "deleted", nullable = false)
    private boolean deleted;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    // No-argument constructor required by JPA
    public InteriorDesignProject() {}

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getDesignerId() { return designerId; }
    public void setDesignerId(Integer designerId) { this.designerId = designerId; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getProjectStatus() { return projectStatus; }
    public void setProjectStatus(String projectStatus) { this.projectStatus = projectStatus; }
    public BigDecimal getBudget() { return budget; }
    public void setBudget(BigDecimal budget) { this.budget = budget; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
