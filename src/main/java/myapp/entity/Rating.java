package myapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Maps to the existing "rating" table (ratingDB.sql).
// We only need the designer and the score (1 to 5) to work out an average.
@Entity
@Table(name = "rating")
public class Rating {

    @Id
    @Column(name = "rating_id")
    private Integer id;

    @Column(name = "designer_id", nullable = false)
    private Integer designerId;

    @Column(name = "score", nullable = false)
    private Integer score;

    // No-argument constructor required by JPA
    public Rating() {}

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getDesignerId() { return designerId; }
    public void setDesignerId(Integer designerId) { this.designerId = designerId; }
    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }
}
