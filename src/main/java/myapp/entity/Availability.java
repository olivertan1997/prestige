package myapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;

// Maps to the existing "availability" table (availabilityDB.sql).
// A row only exists for a date the designer has marked. A date with NO row
// means the designer has not said anything about that day yet.
@Entity
@Table(name = "availability")
public class Availability {

    @Id
    @Column(name = "availability_id")
    private Integer id;

    @Column(name = "designer_id", nullable = false)
    private Integer designerId;

    @Column(name = "availability_date", nullable = false)
    private LocalDate availabilityDate;

    // AVAILABLE or UNAVAILABLE
    @Column(name = "status", nullable = false, length = 15)
    private String status;

    // No-argument constructor required by JPA
    public Availability() {}

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getDesignerId() { return designerId; }
    public void setDesignerId(Integer designerId) { this.designerId = designerId; }
    public LocalDate getAvailabilityDate() { return availabilityDate; }
    public void setAvailabilityDate(LocalDate availabilityDate) { this.availabilityDate = availabilityDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
